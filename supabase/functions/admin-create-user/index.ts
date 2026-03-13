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
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user from the JWT
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !caller) throw new Error("Unauthorized");

    // Check if the caller is an admin
    const { data: profile, error: profileCheckError } = await supabaseClient
      .from('perfiles')
      .select('es_admin')
      .eq('id', caller.id)
      .single();

    if (profileCheckError || !profile?.es_admin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { nombre_completo, email, empresa, es_admin } = await req.json();

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
    // Note: A trigger usually handles profile creation on auth.users insert, 
    // but we update it here to ensure data consistency and set admin role.
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
      // If update fails, maybe insert? (In case trigger didn't run yet)
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

    // 4. Send Email via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;

    if (smtpHost && smtpUser && smtpPass) {
      const client = new SmtpClient();
      await client.connectTLS({
        hostname: smtpHost,
        port: smtpPort,
        username: smtpUser,
        password: smtpPass,
      });

      await client.send({
        from: smtpFrom,
        to: email,
        subject: "Bienvenido a Refaccionaria Rubi - Tus Accesos",
        content: `
          Hola ${nombre_completo},
          
          Se ha creado tu cuenta en Refaccionaria Rubi.
          
          Tus accesos son:
          Correo: ${email}
          Contraseña: ${password}
          
          Puedes iniciar sesión en: ${Deno.env.get("SITE_URL") || 'http://localhost:5173'}
          
          ¡Saludos!
          Equipo de Refaccionaria Rubi
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
