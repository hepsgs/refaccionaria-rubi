import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Official client verification uses global auth header for this request
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !caller) {
      return new Response(JSON.stringify({ 
        error: "Sesión inválida o expirada", 
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if the caller is an admin
    const { data: profile, error: profileCheckError } = await supabaseClient
      .from('perfiles')
      .select('es_admin')
      .eq('id', caller.id)
      .single();

    if (profileCheckError || !profile?.es_admin) {
      return new Response(JSON.stringify({ 
        error: "Access denied. Admin role required.", 
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    const { userId } = body;
    if (!userId) throw new Error("User ID is required");

    if (userId === caller.id) {
      throw new Error("No puedes eliminarte a ti mismo desde este panel.");
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Deleting user from Auth:", userId);
    // Delete from auth.users
    const { error: deleteAuthError } = await supabaseAdminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    console.log("Deleting profile from DB:", userId);
    // Explicitly delete from perfiles just in case cascade is not set
    const { error: deleteProfileError } = await supabaseAdminClient
      .from('perfiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.warn("Profile delete error (might be already gone):", deleteProfileError);
    }

    return new Response(JSON.stringify({ success: true, message: "Usuario eliminado correctamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical error in delete-user function:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
