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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    // Verify admin status
    const { data: profile } = await supabaseClient
      .from('perfiles')
      .select('es_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.es_admin) {
      throw new Error("Forbidden: Admin access required");
    }

    const body = await req.json();
    if (!body) throw new Error("Request body is empty");
    
    const { settings, recipient } = body;
    if (!settings) throw new Error("Settings are required");

    console.log("Testing SMTP for:", settings.smtp_user);
    const client = new SmtpClient();
    
    try {
      const config = {
        hostname: settings.smtp_host,
        port: parseInt(settings.smtp_port || "587"),
        username: settings.smtp_user,
        password: settings.smtp_pass,
      };

      if (settings.smtp_security === 'ssl') {
        await client.connectTLS(config);
      } else {
        await client.connect(config);
      }

      await client.send({
        from: settings.smtp_from || settings.smtp_user,
        to: recipient || settings.smtp_user,
        subject: `Prueba de Conexión SMTP - ${settings.platform_name || 'TecnosisMX'}`,
        content: `La configuración SMTP es correcta.\n\nServidor: ${settings.smtp_host}\nUsuario: ${settings.smtp_user}\nSeguridad: ${settings.smtp_security}`,
      });

      await client.close();
      return new Response(JSON.stringify({ success: true, message: "Prueba exitosa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (smtpError: any) {
      console.error("SMTP error:", smtpError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Error de SMTP: ${smtpError.message || 'Error desconocido'}.` 
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
