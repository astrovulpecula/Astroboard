import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyInvitationRequest {
  invitation_code: string;
  email: string;
}

interface VerifyInvitationResponse {
  valid: boolean;
  invitation_id?: string;
  role?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_code, email }: VerifyInvitationRequest = await req.json();

    // Validate input
    if (!invitation_code || typeof invitation_code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Código de invitación requerido' } as VerifyInvitationResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email válido requerido' } as VerifyInvitationResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS for verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Query the invitation using exact match - no table enumeration possible
    const { data: invitation, error } = await supabaseAdmin
      .from('beta_invitations')
      .select('id, email, role, status, expires_at')
      .eq('invitation_code', invitation_code)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Error de verificación' } as VerifyInvitationResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation exists
    if (!invitation) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Código de invitación inválido o expirado' } as VerifyInvitationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email match (case-insensitive)
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El email no coincide con la invitación' } as VerifyInvitationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'La invitación ha expirado' } as VerifyInvitationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invitation is valid
    return new Response(
      JSON.stringify({
        valid: true,
        invitation_id: invitation.id,
        role: invitation.role,
      } as VerifyInvitationResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ valid: false, error: 'Error interno del servidor' } as VerifyInvitationResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
