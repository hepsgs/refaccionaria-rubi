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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Official client verification uses global auth header for this request
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !caller) {
      console.error("Auth verification failed:", authError);
      return new Response(JSON.stringify({ 
        error: "Sesión inválida o expirada", 
        details: authError,
        message: "Su sesión de administrador no es válida. Intente cerrar sesión y volver a entrar en el panel."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("User verified successfully:", caller.email);

    // Reuse client for DB operations
    console.log("Caller identified for user creation:", caller.email, "ID:", caller.id);

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
      return new Response(JSON.stringify({ 
        error: "Access denied. Admin role required.", 
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { nombre_completo, email, empresa, rol, permisos, telefono } = body;

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdminClient.auth.admin.listUsers();
    if (listError) throw listError;
    
    if (users?.some((u: any) => u.email === email)) {
      return new Response(JSON.stringify({ 
        error: "El correo electrónico ya está en uso. Por favor use otro.", 
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Creating new user:", email);
    const password = Math.random().toString(36).slice(-10);

    const { data: authData, error: createAuthError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo, empresa, telefono }
    });

    if (createAuthError) {
      console.error("Auth creation error:", createAuthError);
      throw createAuthError;
    }

    const newUser = authData.user;
    console.log("Auth user created with ID:", newUser.id);

    // Create or update profile using upsert directly
    console.log("Creating/updating profile for user:", newUser.id);
    const { error: profileError } = await supabaseAdminClient
      .from("perfiles")
      .upsert({
        id: newUser.id,
        nombre_completo,
        empresa,
        telefono,
        rol: rol || 'cliente',
        es_admin: rol === 'admin',
        permisos: permisos || {},
        estatus: "aprobado"
      });

    if (profileError) {
      console.error("Critical error: Profile creation/update failed:", profileError);
      // We don't throw here to at least try to send the email if the auth was created,
      // but the user will likely have issues logging in.
      // Actually, better to throw so the admin knows it failed.
      throw new Error("Error creating profile: " + profileError.message);
    }

    console.log("Profile created/updated successfully");

    console.log("User created, sending welcome email...");

    const { data: dbConfig } = await supabaseAdminClient.from('configuracion').select('*').single();
    
    const smtpHost = dbConfig?.smtp_host || Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(dbConfig?.smtp_port?.toString() || Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = dbConfig?.smtp_user || Deno.env.get("SMTP_USER");
    const smtpPass = dbConfig?.smtp_pass || Deno.env.get("SMTP_PASS");
    const smtpFrom = dbConfig?.smtp_from || Deno.env.get("SMTP_FROM") || smtpUser;
    const smtpSecurity = dbConfig?.smtp_security || 'tls';

    if (smtpHost && smtpUser && smtpPass) {
      try {
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

        const fromFormatted = dbConfig?.smtp_sender_name 
          ? `"${dbConfig.smtp_sender_name}" <${smtpFrom}>`
          : smtpFrom;

        await transporter.sendMail({
          from: fromFormatted,
          to: email,
          subject: `Bienvenido a ${dbConfig?.platform_name || 'TecnosisMX'} - Tus Accesos`,
          text: `Hola ${nombre_completo},\n\nSe ha creado tu cuenta en ${dbConfig?.platform_name || 'TecnosisMX'}.\n\nTus accesos son:\nCorreo: ${email}\nContraseña: ${password}\n\nPuedes iniciar sesión en: ${dbConfig?.site_url || Deno.env.get("SITE_URL") || 'https://tecno-sis-mx.vercel.app'}\n\n¡Saludos!\nEquipo de ${dbConfig?.platform_name || 'TecnosisMX'}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Bienvenido a ${dbConfig?.platform_name || 'TecnosisMX'}</h2>
              <p>Hola <b>${nombre_completo}</b>,</p>
              <p>Se ha creado tu cuenta satisfactoriamente. Aquí tienes tus accesos:</p>
              <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><b>Correo:</b> ${email}</p>
                <p style="margin: 5px 0;"><b>Contraseña:</b> ${password}</p>
              </div>
              <p>Puedes iniciar sesión en: <a href="${dbConfig?.site_url || Deno.env.get("SITE_URL") || 'https://tecno-sis-mx.vercel.app'}">${dbConfig?.platform_name || 'TecnosisMX'}</a></p>
              <p>Por seguridad, te recomendamos cambiar tu contraseña al ingresar.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #888; font-size: 12px;">Equipo de ${dbConfig?.platform_name || 'TecnosisMX'}</p>
            </div>
          `,
        });

        console.log("Welcome email sent");
      } catch (emailErr: any) {
        console.error("Failed to send welcome email:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.id }), {
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
