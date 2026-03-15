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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatWhatsAppNumber = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `521${cleaned}@c.us`;
  if (cleaned.startsWith('52') && !cleaned.startsWith('521') && cleaned.length === 12) return `521${cleaned.substring(2)}@c.us`;
  return cleaned.includes('@') ? cleaned : `${cleaned}@c.us`;
};

async function sendWhatsApp(to: string, text: string, config: any) {
  if (!config.whatsapp_koonetxa_enabled || !config.whatsapp_koonetxa_api_key || !config.whatsapp_koonetxa_session) return;
  const chatId = formatWhatsAppNumber(to);
  const session = config.whatsapp_koonetxa_session;
  const apiKey = config.whatsapp_koonetxa_api_key;
  const baseUrl = "https://ws.koonetxa.cloud/api";

  try {
    await fetch(`${baseUrl}/startTyping`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }, body: JSON.stringify({ chatId, session }) });
    await delay(Math.floor(Math.random() * 3000) + 2000);
    const resp = await fetch(`${baseUrl}/sendText`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }, body: JSON.stringify({ chatId, text, session }) });
    await fetch(`${baseUrl}/stopTyping`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }, body: JSON.stringify({ chatId, session }) });
    return await resp.json();
  } catch (err) { console.error("WhatsApp Error:", err); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders, status: 200 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { type, user_id } = await req.json();
    if (!type || !user_id) throw new Error("Missing parameters");

    const { data: dbConfig } = await supabaseAdmin.from('configuracion').select('*').single();
    const { data: profile } = await supabaseAdmin.from('perfiles').select('*').eq('id', user_id).single();
    if (!profile) throw new Error("Profile not found");

    const platformName = dbConfig?.platform_name || 'Refaccionaria Rubi';

    // 1. REGISTRATION NOTIFICATION (Events: 'registration')
    if (type === 'registration') {
      const emailEnabled = dbConfig?.notify_register_email !== false;
      const wsEnabled = dbConfig?.notify_register_whatsapp === true;

      if (emailEnabled) {
        // Send email to admin notification list
        const adminEmailStr = dbConfig?.notificacion_registro_emails || '';
        const admins = adminEmailStr.split(',').map(e => e.trim()).filter(e => e.includes('@'));
        if (admins.length > 0) {
          const transporter = nodemailer.createTransport({
            host: dbConfig.smtp_host, port: dbConfig.smtp_port, secure: dbConfig.smtp_security === 'ssl',
            auth: { user: dbConfig.smtp_user, pass: dbConfig.smtp_pass },
            tls: { rejectUnauthorized: false }
          });
          await transporter.sendMail({
            from: `"${platformName}" <${dbConfig.smtp_user}>`,
            to: admins.join(', '),
            subject: `NUEVO REGISTRO: ${profile.nombre_completo}`,
            html: `<h3>Nuevo Registro de Cliente</h3>
                   <p><strong>Nombre:</strong> ${profile.nombre_completo}</p>
                   <p><strong>Empresa:</strong> ${profile.empresa || 'N/A'}</p>
                   <p><strong>Email:</strong> ${profile.email}</p>
                   <p><strong>Teléfono:</strong> ${profile.telefono || 'N/A'}</p>`
          });
        }
      }

      if (wsEnabled && dbConfig.whatsapp_koonetxa_enabled) {
        const adminNumbersStr = dbConfig.whatsapp_notificacion_registro_numeros || "";
        const admins = adminNumbersStr.split(',').map(n => n.trim()).filter(n => n.length >= 10);
        let msg = dbConfig.whatsapp_template_registro_admin || "Nuevo cliente: {nombre} ({empresa}).";
        msg = msg.replace('{nombre}', profile.nombre_completo).replace('{empresa}', profile.empresa || 'N/A');
        for (const num of admins) {
          await sendWhatsApp(num, msg, dbConfig);
          await delay(5000);
        }
      }
    }

    // 2. ACTIVATION NOTIFICATION (Events: 'activation')
    if (type === 'activation') {
      const emailEnabled = dbConfig?.notify_activation_email !== false;
      const wsEnabled = dbConfig?.notify_activation_whatsapp === true;

      if (emailEnabled) {
        const transporter = nodemailer.createTransport({
          host: dbConfig.smtp_host, port: dbConfig.smtp_port, secure: dbConfig.smtp_security === 'ssl',
          auth: { user: dbConfig.smtp_user, pass: dbConfig.smtp_pass },
          tls: { rejectUnauthorized: false }
        });
        await transporter.sendMail({
          from: `"${platformName}" <${dbConfig.smtp_user}>`,
          to: profile.email,
          subject: `¡Cuenta Activada! - ${platformName}`,
          html: `<h3>Hola ${profile.nombre_completo}</h3>
                 <p>Tu cuenta ha sido aprobada. Ya puedes entrar a la plataforma y realizar tus pedidos.</p>`
        });
      }

      if (wsEnabled && dbConfig.whatsapp_koonetxa_enabled && profile.telefono) {
        let msg = dbConfig.whatsapp_template_aprobacion_cliente || "¡Hola {nombre}! Tu cuenta en {plataforma} ha sido aprobada.";
        msg = msg.replace('{nombre}', profile.nombre_completo).replace('{plataforma}', platformName);
        await sendWhatsApp(profile.telefono, msg, dbConfig);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
