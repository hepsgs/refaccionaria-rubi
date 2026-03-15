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
    if (!caller) throw new Error("Unauthorized: No user found for the provided token.");

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { order_id } = body;
    if (!order_id) throw new Error("Order ID is required");

    // Fetch site configuration FIRST using Admin client
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: dbConfig } = await supabaseAdminClient.from('configuracion').select('*').single();

    // Fetch order details using ADMIN client to bypass RLS issues
    const { data: order, error: orderError } = await supabaseAdminClient
      .from('pedidos')
      .select(`
        *,
        cliente:perfiles!cliente_id (
          nombre_completo,
          email,
          empresa
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) throw new Error("Order not found: " + orderError?.message);

    const platformName = dbConfig?.platform_name || 'Refaccionaria Rubi';
    const smtpSettings = {
      host: dbConfig?.smtp_host || Deno.env.get("SMTP_HOST"),
      port: parseInt(dbConfig?.smtp_port || Deno.env.get("SMTP_PORT") || "587"),
      user: dbConfig?.smtp_user || Deno.env.get("SMTP_USER"),
      pass: dbConfig?.smtp_pass || Deno.env.get("SMTP_PASS"),
      security: dbConfig?.smtp_security || "tls"
    };

    if (!smtpSettings.host || !smtpSettings.user || !smtpSettings.pass) {
      throw new Error("SMTP configuration is incomplete in database or environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.security === 'ssl',
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const formatPrice = (num: number) => {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    };

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
        text: `¡Gracias por tu pedido, ${order.cliente.nombre_completo}! Tu pedido ha sido recibido. Total: $${formatPrice(order.total)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #e11d48; margin-top: 0;">¡Gracias por tu pedido!</h2>
            <p>Hola <strong>${order.cliente.nombre_completo}</strong>,</p>
            <p>Tu pedido ha sido recibido correctamente y está siendo procesado.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Folio o ID del Pedido:</p>
              <p style="margin: 0; font-weight: bold; font-size: 18px;">${order.folio || order.id}</p>
            </div>

            <h3>Resumen del Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; text-align: left;">SKU</th>
                  <th style="padding: 8px; text-align: left;">Producto</th>
                  <th style="padding: 8px; text-align: center;">Cant.</th>
                  <th style="padding: 8px; text-align: right;">Unitario</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 8px; text-align: right; font-weight: bold;">Total:</td>
                  <td style="padding: 15px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #e11d48;">$${formatPrice(order.total)}</td>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top: 30px; font-size: 14px; color: #64748b;">
              <p><strong>Empresa:</strong> ${order.cliente.empresa || 'N/A'}</p>
              <p><strong>Fecha:</strong> ${order.creado_at ? new Date(order.creado_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A'}</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0 20px;">
            <p style="text-align: center; font-size: 12px; color: #94a3b8;">
              Este es un correo automático de ${platformName}.
            </p>
          </div>
        `,
      });
      console.log(`Confirmation email sent to customer: ${order.cliente.email}`);
    } catch (clientError: any) {
      console.error("Error sending to client:", clientError);
    }

    // Send to Notification List (if any)
    const notificationEmailsStr = dbConfig?.notificacion_pedidos_emails || '';
    const notificationEmails = notificationEmailsStr
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e && e.includes('@'));

    if (notificationEmails.length > 0) {
      try {
        await transporter.sendMail({
          from: `"${platformName}" <${smtpSettings.user}>`,
          to: notificationEmails.join(', '),
          subject: `AVISO: Nuevo Pedido Recibido - ${order.folio || order.id}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #1e293b; margin-top: 0;">NOTIFICACIÓN DE PEDIDO</h2>
              <p>Se ha recibido un nuevo pedido en la plataforma.</p>
              
              <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Cliente:</p>
                <p style="margin: 0; font-weight: bold;">${order.cliente.nombre_completo} (${order.cliente.email})</p>
                <p style="margin: 0; font-size: 14px; color: #64748b; margin-top: 10px;">Folio/ID:</p>
                <p style="margin: 0; font-weight: bold;">${order.folio || order.id}</p>
              </div>

              <h3>Detalle de Productos</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #e2e8f0;">
                    <th style="padding: 8px; text-align: left;">SKU</th>
                    <th style="padding: 8px; text-align: left;">Nombre</th>
                    <th style="padding: 8px; text-align: center;">Cant.</th>
                    <th style="padding: 8px; text-align: right;">Unitario</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <p style="margin-top: 20px; text-align: right; font-weight: bold; font-size: 18px;">
                TOTAL: $${formatPrice(order.total)}
              </p>

              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0 20px;">
              <p style="text-align: center; font-size: 12px; color: #94a3b8;">
                ${platformName} - Sistema de Pedidos
              </p>
            </div>
          `,
        });
        console.log(`Notification emails sent to: ${notificationEmails.join(', ')}`);
      } catch (notifError: any) {
        console.error("Error sending notification copy:", notifError);
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
