import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from "npm:nodemailer";

export const config = {
  verify_jwt: false
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Utility to sleep/delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatWhatsAppNumber = (phone: string) => {
  // Remove non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  // Add 521 for Mexico if it's 10 digits
  if (cleaned.length === 10) {
    return `521${cleaned}@c.us`;
  }
  // If it already has 52 but not 521 (standard WhatsApp oddity for Mexico)
  if (cleaned.startsWith('52') && !cleaned.startsWith('521') && cleaned.length === 12) {
    return `521${cleaned.substring(2)}@c.us`;
  }
  // Generic fallback if it doesn't match Mexico patterns
  return cleaned.includes('@') ? cleaned : `${cleaned}@c.us`;
};

async function sendWhatsApp(to: string, text: string, config: any) {
  if (!config.whatsapp_koonetxa_enabled || !config.whatsapp_koonetxa_api_key || !config.whatsapp_koonetxa_session) {
    console.log("WhatsApp disabled or missing config");
    return;
  }

  const chatId = formatWhatsAppNumber(to);
  const session = config.whatsapp_koonetxa_session;
  const apiKey = config.whatsapp_koonetxa_api_key;
  const baseUrl = "https://ws.koonetxa.cloud/api";

  try {
    // 1. Start Typing
    console.log(`Simulating typing for ${chatId}...`);
    await fetch(`${baseUrl}/startTyping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ chatId, session })
    });

    // 2. Typing Delay (Random 4-7 seconds)
    const typingDelay = Math.floor(Math.random() * 4000) + 3000;
    await delay(typingDelay);

    // 3. Send Message
    console.log(`Sending WhatsApp to ${chatId}...`);
    const resp = await fetch(`${baseUrl}/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ chatId, text, session })
    });

    // 4. Stop Typing
    await fetch(`${baseUrl}/stopTyping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ chatId, session })
    });

    const result = await resp.json();
    console.log(`WhatsApp result for ${chatId}:`, result);
    return result;
  } catch (err) {
    console.error(`WhatsApp error for ${chatId}:`, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    
    // Official client for auth verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!caller) throw new Error("Unauthorized");

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) throw new Error("Order ID is required");

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: dbConfig } = await supabaseAdminClient.from('configuracion').select('*').single();

    const { data: order, error: orderError } = await supabaseAdminClient
      .from('pedidos')
      .select(`
        *,
        cliente:perfiles!cliente_id (
          nombre_completo,
          email,
          empresa,
          telefono
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const platformName = dbConfig?.platform_name || 'Refaccionaria Rubi';
    const notifyEmail = dbConfig?.notify_order_email !== false; // Default true
    const notifyWhatsApp = dbConfig?.notify_order_whatsapp === true; // Default false

    const formatPrice = (num: number) => {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    };

    // --- EMAIL LOGIC ---
    if (notifyEmail) {
      const smtpSettings = {
        host: dbConfig?.smtp_host || Deno.env.get("SMTP_HOST"),
        port: parseInt(dbConfig?.smtp_port || Deno.env.get("SMTP_PORT") || "587"),
        user: dbConfig?.smtp_user || Deno.env.get("SMTP_USER"),
        pass: dbConfig?.smtp_pass || Deno.env.get("SMTP_PASS"),
        security: dbConfig?.smtp_security || "tls"
      };

      if (smtpSettings.host && smtpSettings.user && smtpSettings.pass) {
        const transporter = nodemailer.createTransport({
          host: smtpSettings.host,
          port: smtpSettings.port,
          secure: smtpSettings.security === 'ssl',
          auth: { user: smtpSettings.user, pass: smtpSettings.pass },
          tls: { rejectUnauthorized: false }
        });

        const itemsHtml = order.items.map((item: any) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.sku}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #64748b;">${item.nombre || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${formatPrice(item.precio_unitario)}</td>
          </tr>
        `).join('');

        // Send to Client
        try {
          await transporter.sendMail({
            from: `"${platformName}" <${smtpSettings.user}>`,
            to: order.cliente.email,
            subject: `Confirmación de Pedido - ${platformName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #e11d48; margin-top: 0;">¡Gracias por tu pedido!</h2>
                <p>Hola <strong>${order.cliente.nombre_completo}</strong>,</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">Folio o ID del Pedido:</p>
                  <p style="margin: 0; font-weight: bold; font-size: 18px;">${order.folio || order.id}</p>
                </div>
                <h3>Resumen</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead><tr style="background: #f1f5f9;"><th style="padding: 8px;">SKU</th><th style="padding: 8px;">Producto</th><th style="padding: 8px;">Cant.</th><th style="padding: 8px;">Unitario</th></tr></thead>
                  <tbody>${itemsHtml}</tbody>
                  <tfoot><tr><td colspan="3" style="padding: 15px 8px; text-align: right; font-weight: bold;">Total:</td><td style="padding: 15px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #e11d48;">$${formatPrice(order.total)}</td></tr></tfoot>
                </table>
                <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px;">${platformName}</p>
              </div>
            `,
          });
        } catch (e) { console.error("Client email error:", e); }

        // Send to Admin Notification List
        const notificationEmailsStr = dbConfig?.notificacion_pedidos_emails || '';
        const adminEmails = notificationEmailsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
        if (adminEmails.length > 0) {
          try {
            await transporter.sendMail({
              from: `"${platformName}" <${smtpSettings.user}>`,
              to: adminEmails.join(', '),
              subject: `AVISO: Nuevo Pedido de ${order.cliente.nombre_completo}`,
              html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2>Nuevo Pedido Recibido</h2>
                <p><strong>Cliente:</strong> ${order.cliente.nombre_completo} (${order.cliente.email})</p>
                <p><strong>Folio:</strong> ${order.folio || order.id}</p>
                <p><strong>Total:</strong> $${formatPrice(order.total)}</p>
                <hr/>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead><tr style="background: #f1f5f9;"><th style="padding: 8px;">SKU</th><th style="padding: 8px;">Producto</th><th style="padding: 8px;">Cant.</th></tr></thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
              </div>`,
            });
          } catch (e) { console.error("Admin email error:", e); }
        }
      }
    }

    // --- WHATSAPP LOGIC ---
    if (notifyWhatsApp && dbConfig?.whatsapp_koonetxa_enabled) {
      // 1. WhatsApp to Client
      if (order.cliente.telefono) {
        let clientMsg = dbConfig.whatsapp_template_pedido_cliente || "Hola {nombre}, recibimos tu pedido #{folio}.";
        clientMsg = clientMsg.replace('{nombre}', order.cliente.nombre_completo).replace('{folio}', order.folio || order.id);
        await sendWhatsApp(order.cliente.telefono, clientMsg, dbConfig);
        
        // Anti-spam recipient delay
        await delay(5000);
      }

      // 2. WhatsApp to Admins
      const adminNumbersStr = dbConfig.whatsapp_notificacion_pedidos_numeros || "";
      const adminNumbers = adminNumbersStr.split(',').map((n: string) => n.trim()).filter((n: string) => n.length >= 10);
      
      if (adminNumbers.length > 0) {
        let adminMsg = dbConfig.whatsapp_template_pedido_admin || "Nuevo pedido de {nombre}. Folio: {folio}. Total: {total}.";
        adminMsg = adminMsg
          .replace('{nombre}', order.cliente.nombre_completo)
          .replace('{folio}', order.folio || order.id)
          .replace('{total}', `$${formatPrice(order.total)}`);

        for (const num of adminNumbers) {
          await sendWhatsApp(num, adminMsg, dbConfig);
          // Wait before next admin to avoid rapid-fire
          await delay(8000);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
