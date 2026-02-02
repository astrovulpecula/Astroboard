import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_beta_admin", {
      p_user_id: requestingUser.id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user ID to delete from request body
    const { user_id, beta_user_id } = await req.json();

    if (!user_id || !beta_user_id) {
      return new Response(
        JSON.stringify({ error: "user_id and beta_user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete user's storage files
    // Delete from user-data bucket
    const { data: userDataFiles } = await supabaseAdmin.storage
      .from("user-data")
      .list(user_id);

    if (userDataFiles && userDataFiles.length > 0) {
      const filePaths = userDataFiles.map((f) => `${user_id}/${f.name}`);
      await supabaseAdmin.storage.from("user-data").remove(filePaths);
    }

    // Delete from user-images bucket
    const { data: userImageFiles } = await supabaseAdmin.storage
      .from("user-images")
      .list(user_id);

    if (userImageFiles && userImageFiles.length > 0) {
      const filePaths = userImageFiles.map((f) => `${user_id}/${f.name}`);
      await supabaseAdmin.storage.from("user-images").remove(filePaths);
    }

    // Delete usage_metrics for this user
    await supabaseAdmin
      .from("usage_metrics")
      .delete()
      .eq("user_id", beta_user_id);

    // Delete beta_feedback for this user
    await supabaseAdmin
      .from("beta_feedback")
      .delete()
      .eq("user_id", beta_user_id);

    // Delete beta_user record (this should cascade related records)
    const { error: betaUserError } = await supabaseAdmin
      .from("beta_users")
      .delete()
      .eq("id", beta_user_id);

    if (betaUserError) {
      console.error("Error deleting beta_user:", betaUserError);
      return new Response(
        JSON.stringify({ error: "Failed to delete beta user record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "User and all data deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});