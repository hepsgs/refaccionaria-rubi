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
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch SMTP settings and notification emails
    const { data: dbConfig, error: configError } = await supabaseAdminClient
      .from('configuracion')
      .select('*')
      .single();
    
    if (configError) throw configError;

    const body = await req.json();
    const { user } = body;

    if (!user) throw new Error("User data is missing in request body");

    const smtpHost = dbConfig?.smtp_host;
    const smtpPort = parseInt(dbConfig?.smtp_port?.toString() || "587");
    const smtpUser = dbConfig?.smtp_user;
    const smtpPass = dbConfig?.smtp_pass;
    const smtpFrom = dbConfig?.smtp_from || smtpUser;
    const smtpSecurity = dbConfig?.smtp_security || 'tls';
    const notificationEmails = dbConfig?.notificacion_registro_emails;

    console.log("Processing registration notification for:", user.email);
    console.log("Recipients:", notificationEmails);

    if (smtpHost && smtpUser && smtpPass && notificationEmails) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecurity === 'ssl',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const emails = notificationEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e);

      if (emails.length > 0) {
        await transporter.sendMail({
          from: `"${dbConfig?.smtp_sender_name || 'Refaccionaria Rubi'}" <${smtpFrom}>`,
          to: emails.join(','),
          subject: `Nuevo Usuario Registrado: ${user.nombre_completo}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #e11d48;">Nuevo Registro de Usuario</h2>
              <p>Se ha registrado un nuevo usuario desde la página principal:</p>
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 5px 0;"><b>Nombre:</b> ${user.nombre_completo}</p>
                <p style="margin: 5px 0;"><b>Empresa:</b> ${user.empresa || 'No especificada'}</p>
                <p style="margin: 5px 0;"><b>Teléfono:</b> ${user.telefono || 'No especificado'}</p>
                <p style="margin: 5px 0;"><b>Correo:</b> ${user.email}</p>
              </div>
              <p>Puedes gestionar este usuario en el panel de administración:</p>
              <a href="${dbConfig?.site_url || 'https://refaccionariarubi.com'}/admin" 
                 style="display: inline-block; background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Ir al Panel de Administración
              </a>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="font-size: 12px; color: #64748b;">Este es un correo automático, por favor no respondas directamente.</p>
            </div>
          `,
        });
        console.log("Notification emails sent successfully");
      }
    } else {
      console.warn("SMTP settings or notification emails not configured properly");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in notify-registration:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
