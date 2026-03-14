import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

export const config = {
  verify_jwt: false
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    if (!body) throw new Error("El cuerpo de la solicitud está vacío");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    
    // Official client verification uses global auth header for this request
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();

    if (authError) {
      throw new Error("Error de autenticación: " + authError.message);
    }
    if (!caller) {
      throw new Error("Usuario no autenticado.");
    }
    
    const { settings, recipient } = body;
    if (!settings) throw new Error("La configuración de SMTP es requerida");

    console.log("Testing SMTP for:", settings.smtp_user);
    
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port || "587"),
        secure: settings.smtp_security === 'ssl', // true for 465, false for other ports
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: settings.smtp_sender_name 
          ? `"${settings.smtp_sender_name}" <${settings.smtp_from || settings.smtp_user}>`
          : settings.smtp_from || settings.smtp_user,
        to: recipient || settings.smtp_user,
        subject: `Prueba de Conexión SMTP - ${settings.platform_name || 'TecnosisMX'}`,
        text: `La configuración SMTP es correcta.\n\nServidor: ${settings.smtp_host}\nUsuario: ${settings.smtp_user}\nSeguridad: ${settings.smtp_security}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Prueba de Conexión SMTP Exitosa</h2>
            <p>La configuración de correo ha sido validada correctamente.</p>
            <ul>
              <li><b>Servidor:</b> ${settings.smtp_host}</li>
              <li><b>Usuario:</b> ${settings.smtp_user}</li>
              <li><b>Seguridad:</b> ${settings.smtp_security}</li>
            </ul>
            <p>Saludos,<br/>Equipo de ${settings.platform_name || 'TecnosisMX'}</p>
          </div>
        `
      };

      const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data: dbConfig } = await supabaseAdminClient.from('configuracion').select('*').single();
      console.log("DB Config:", dbConfig); // Log the fetched config for debugging

      const info = await transporter.sendMail(mailOptions);
      console.log("Message sent: %s", info.messageId);

      return new Response(JSON.stringify({ success: true, message: "Prueba exitosa", messageId: info.messageId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (smtpError: any) {
      console.error("SMTP error:", smtpError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Error de SMTP (Nodemailer): ${smtpError.message || 'Error desconocido'}.` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
