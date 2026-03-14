import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { order_id } = body;
    if (!order_id) throw new Error("Order ID is required");

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
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

    // Fetch site configuration
    const { data: dbConfig } = await supabaseClient
      .from('configuracion')
      .select('*')
      .single();

    const platformName = dbConfig?.platform_name || 'TecnosisMX';
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

    const client = new SmtpClient();
    
    if (smtpSettings.security === 'ssl') {
      await client.connectTLS({
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        username: smtpSettings.user,
        password: smtpSettings.pass,
      });
    } else {
      await client.connect({
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        username: smtpSettings.user,
        password: smtpSettings.pass,
      });
    }

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.sku}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.precio_unitario.toLocaleString()}</td>
      </tr>
    `).join('');

    await client.send({
      from: `"${platformName}" <${smtpSettings.user}>`,
      to: order.cliente.email,
      subject: `Confirmación de Pedido - ${platformName}`,
      content: "text/html",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e11d48; margin-top: 0;">¡Gracias por tu pedido!</h2>
          <p>Hola <strong>${order.cliente.nombre_completo}</strong>,</p>
          <p>Tu pedido ha sido recibido correctamente y está siendo procesado.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Folio del Pedido:</p>
            <p style="margin: 0; font-weight: bold; font-size: 18px;">${order_id}</p>
          </div>

          <h3>Resumen del Pedido</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left;">SKU</th>
                <th style="padding: 8px; text-align: center;">Cant.</th>
                <th style="padding: 8px; text-align: right;">Unitario</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 8px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 15px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #e11d48;">$${order.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Empresa: ${order.cliente.empresa}
          </p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0 20px;">
          <p style="text-align: center; font-size: 12px; color: #94a3b8;">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
