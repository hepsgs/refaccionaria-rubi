import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    // Get the user from the JWT
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !caller) throw new Error("Invalid or expired token");

    // Check if the caller is an admin
    const { data: profile, error: profileCheckError } = await supabaseClient
      .from('perfiles')
      .select('es_admin')
      .eq('id', caller.id)
      .single();

    if (profileCheckError) throw new Error("Error checking admin status: " + profileCheckError.message);
    if (!profile?.es_admin) throw new Error("Forbidden: Admin access required");

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { nombre_completo, email, empresa, es_admin, test, settings: testSettings } = body;

    // Handle Test Mode
    if (test && testSettings) {
      const client = new SmtpClient();
      const config = {
        hostname: testSettings.smtp_host,
        port: parseInt(testSettings.smtp_port || "587"),
        username: testSettings.smtp_user,
        password: testSettings.smtp_pass,
      };

      if (testSettings.smtp_security === 'ssl') {
        await client.connectTLS(config);
      } else {
        await client.connect(config);
      }
      
      // If none but port 587, STARTTLS is often expected. The library might need manual startTLS()
      // but v0.7.0 usually handles it if configured or we just use connect.
      // If the user specifies 'tls', we've already done .connect() which is typical for STARTTLS initiation in many clients.

      await client.send({
        from: testSettings.smtp_from || testSettings.smtp_user,
        to: body.recipient || testSettings.smtp_user, // Use provided recipient or fallback to user
        subject: `Prueba de Conexión SMTP - ${testSettings.platform_name || 'GML'}`,
        content: `La configuración SMTP es correcta. 
        Enviado desde: ${testSettings.site_url || 'Refaccionaria Rubi'}`,
      });

      await client.close();
      return new Response(JSON.stringify({ success: true, message: "Prueba exitosa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1. Generate a random password
    const password = Math.random().toString(36).slice(-10);

    // 2. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo, empresa }
    });

    if (authError) throw authError;

    const user = authData.user;

    // 3. Update public.perfiles
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
      const { error: insertError } = await supabaseClient
        .from("perfiles")
        .upsert({
          id: user.id,
          nombre_completo,
          empresa,
          es_admin: !!es_admin,
          estatus: "aprobado"
        });
      if (insertError) throw insertError;
    }

    // 4. Send Email via SMTP using DB configuration (fallback to ENV)
    const { data: dbConfig } = await supabaseClient.from('configuracion').select('*').single();
    
    const smtpHost = dbConfig?.smtp_host || Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(dbConfig?.smtp_port?.toString() || Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = dbConfig?.smtp_user || Deno.env.get("SMTP_USER");
    const smtpPass = dbConfig?.smtp_pass || Deno.env.get("SMTP_PASS");
    const smtpFrom = dbConfig?.smtp_from || Deno.env.get("SMTP_FROM") || smtpUser;
    const smtpSecurity = dbConfig?.smtp_security || 'tls';

    if (smtpHost && smtpUser && smtpPass) {
      const client = new SmtpClient();
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
        subject: `Bienvenido a ${dbConfig?.platform_name || 'GML'} - Tus Accesos`,
        content: `
          Hola ${nombre_completo},
          
          Se ha creado tu cuenta en ${dbConfig?.platform_name || 'GML'}.
          
          Tus accesos son:
          Correo: ${email}
          Contraseña: ${password}
          
          Puedes iniciar sesión en: ${dbConfig?.site_url || Deno.env.get("SITE_URL") || 'http://localhost:5173'}
          
          ¡Saludos!
          Equipo de ${dbConfig?.platform_name || 'GML'}
        `,
      });

      await client.close();
    } else {
      console.warn("SMTP keys not configured correctly. Skipping email.");
    }

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
