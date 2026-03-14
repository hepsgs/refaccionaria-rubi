import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    // Get the user from the JWT to verify they are logged in
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !caller) {
      console.error("Auth error:", userError);
      throw new Error("Invalid or expired token");
    }

    console.log("Caller identified:", caller.email);

    // Check if the caller is an admin
    const { data: profile, error: profileCheckError } = await supabaseClient
      .from('perfiles')
      .select('es_admin')
      .eq('id', caller.id)
      .single();

    if (profileCheckError) {
      console.error("Profile check error:", profileCheckError);
      throw new Error("Error checking admin status: " + profileCheckError.message);
    }
    
    if (!profile?.es_admin) {
      console.warn("User is not admin:", caller.email);
      throw new Error("Forbidden: Admin access required");
    }

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { nombre_completo, email, empresa, es_admin, test, settings: testSettings } = body;

    // Handle Test Mode
    if (test && testSettings) {
      console.log("Starting SMTP test for:", testSettings.smtp_user);
      const client = new SmtpClient();
      try {
        const config = {
          hostname: testSettings.smtp_host,
          port: parseInt(testSettings.smtp_port || "587"),
          username: testSettings.smtp_user,
          password: testSettings.smtp_pass,
        };

        console.log("Connecting to:", config.hostname, "port:", config.port, "security:", testSettings.smtp_security);

        if (testSettings.smtp_security === 'ssl') {
          await client.connectTLS(config);
        } else {
          await client.connect(config);
        }

        console.log("Connected. Sending test email...");

        await client.send({
          from: testSettings.smtp_from || testSettings.smtp_user,
          to: body.recipient || testSettings.smtp_user,
          subject: `Prueba de Conexión SMTP - ${testSettings.platform_name || 'TecnosisMX'}`,
          content: `La configuración SMTP es correcta.\n\nServidor: ${testSettings.smtp_host}\nUsuario: ${testSettings.smtp_user}\nSeguridad: ${testSettings.smtp_security}`,
        });

        await client.close();
        console.log("SMTP test successful");
        return new Response(JSON.stringify({ success: true, message: "Prueba exitosa" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (smtpError: any) {
        console.error("SMTP test error details:", smtpError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Error de SMTP: ${smtpError.message || 'Error desconocido'}. Revisa el host, puerto y credenciales.` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 so the frontend can show the specific error message
        });
      }
    }

    // ... (rest of the creation logic)
    console.log("Creating new user:", email);
    const password = Math.random().toString(36).slice(-10);

    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo, empresa }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      throw authError;
    }

    const user = authData.user;

    const { error: profileError } = await supabaseClient
      .from("perfiles")
      .update({
        nombre_completo,
        empresa,
        es_admin: !!es_admin,
        estatus: "aprobado"
      })
      .eq("id", user.id);

    if (profileError) {
      console.log("Updating profile failed, trying upsert...");
      const { error: insertError } = await supabaseClient
        .from("perfiles")
        .upsert({
          id: user.id,
          nombre_completo,
          empresa,
          es_admin: !!es_admin,
          estatus: "aprobado"
        });
      if (insertError) {
        console.error("Profile upsert error:", insertError);
        throw insertError;
      }
    }

    console.log("User created, sending welcome email...");

    const { data: dbConfig } = await supabaseClient.from('configuracion').select('*').single();
    
    const smtpHost = dbConfig?.smtp_host || Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(dbConfig?.smtp_port?.toString() || Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = dbConfig?.smtp_user || Deno.env.get("SMTP_USER");
    const smtpPass = dbConfig?.smtp_pass || Deno.env.get("SMTP_PASS");
    const smtpFrom = dbConfig?.smtp_from || Deno.env.get("SMTP_FROM") || smtpUser;
    const smtpSecurity = dbConfig?.smtp_security || 'tls';

    if (smtpHost && smtpUser && smtpPass) {
      const client = new SmtpClient();
      try {
        const config = {
          hostname: smtpHost,
          port: smtpPort,
          username: smtpUser,
          password: smtpPass,
        };

        if (smtpSecurity === 'ssl') {
          await client.connectTLS(config);
        } else {
          await client.connect(config);
        }

        const fromFormatted = dbConfig?.smtp_sender_name 
          ? `${dbConfig.smtp_sender_name} <${smtpFrom}>`
          : smtpFrom;

        await client.send({
          from: fromFormatted,
          to: email,
          subject: `Bienvenido a ${dbConfig?.platform_name || 'TecnosisMX'} - Tus Accesos`,
          content: `
            Hola ${nombre_completo},
            
            Se ha creado tu cuenta en ${dbConfig?.platform_name || 'TecnosisMX'}.
            
            Tus accesos son:
            Correo: ${email}
            Contraseña: ${password}
            
            Puedes iniciar sesión en: ${dbConfig?.site_url || Deno.env.get("SITE_URL") || 'https://tecno-sis-mx.vercel.app'}
            
            ¡Saludos!
            Equipo de ${dbConfig?.platform_name || 'TecnosisMX'}
          `,
        });

        await client.close();
        console.log("Welcome email sent");
      } catch (emailErr: any) {
        console.error("Failed to send welcome email:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical error in function:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
