import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restrict CORS to allowed origins only
const allowedOrigins = [
  'https://astro-capture-log.lovable.app',
  'https://id-preview--1ce89238-42d3-4932-9266-e7e088a5bf74.lovable.app',
];

// Pattern to match Lovable preview domains (for development/testing)
const lovablePreviewPattern = /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/;

const getCorsHeaders = (origin: string | null) => {
  // Check if origin matches allowed list or Lovable preview pattern
  const isAllowed = origin && (
    allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, ''))) ||
    lovablePreviewPattern.test(origin)
  );
  
  const allowedOrigin = isAllowed ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
};

interface VerifyInvitationRequest {
  invitation_code: string;
  email: string; // Email del usuario que se registra (para actualizar la invitación)
}

interface VerifyInvitationResponse {
  valid: boolean;
  invitation_id?: string;
  role?: string;
  error?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    // Query the invitation using exact match - code only (no email match required)
    const { data: invitation, error } = await supabaseAdmin
      .from('beta_invitations')
      .select('id, email, role, status, expires_at')
      .eq('invitation_code', invitation_code)
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
        JSON.stringify({ valid: false, error: 'Código de invitación inválido' } as VerifyInvitationResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already used (status is 'accepted')
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Este código de invitación ya ha sido utilizado' } as VerifyInvitationResponse),
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

    // IMMEDIATELY mark invitation as accepted to prevent reuse
    const { error: updateError } = await supabaseAdmin
      .from('beta_invitations')
      .update({ 
        email: email.toLowerCase(),
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
      .eq('status', 'pending'); // Extra safety: only update if still pending

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Error al procesar la invitación' } as VerifyInvitationResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invitation is valid and now marked as used
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
