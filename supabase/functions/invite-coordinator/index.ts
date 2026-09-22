// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

type InvitePayload = { coordinatorId?: string };
function errorResponse(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

// Client-facing endpoint: the caller must send a user's JWT
// (Authorization: Bearer <access_token>) — no apiKey-only access.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { coordinatorId } = (await req.json()) as InvitePayload;

    if (!coordinatorId) {
      return errorResponse('missing_coordinator_id', 400);
    }

    // Step 2 — ownership: ctx.supabase respeta RLS, así que si no devuelve
    // fila, quien llama no es dueño de ese coordinador. No comparamos
    // owner_id a mano; dejamos que la policy lo decida.
    const { data: coordinator, error: fetchError } = await ctx.supabase
      .from('coordinators')
      .select('id, email, user_id')
      .eq('id', coordinatorId)
      .maybeSingle();

    if (fetchError) {
      return errorResponse('unknown_error', 500);
    }

    if (!coordinator) {
      return errorResponse('not_authorized', 403);
    }

    // Step 3 — validar estado
    if (coordinator.user_id) {
      return errorResponse('already_invited', 409);
    }
    if (!coordinator.email) {
      return errorResponse('missing_email', 400);
    }
    if (coordinator.email === ctx.userClaims?.email) {
      return errorResponse('cannot_invite_self', 400);
    }

    // Step 4 — recién acá tocamos service-role. inviteUserByEmail's `data`
    // mapea a user_metadata, NO a app_metadata — el rol se setea aparte
    // (ver Step 5).
    const { data: inviteData, error: inviteError } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(coordinator.email, {
      data: { coordinator_id: coordinator.id },
    });

    if (inviteError) {
      if (
        inviteError.code === 'user_already_exists'
        || inviteError.message.includes('already been registered')) {
        return errorResponse('email_already_registered', 409);
      }
      return errorResponse('unknown_error', 500);
    }

    const newUserId = inviteData.user.id;

    // Step 5 — el rol va en app_metadata: es el único que no puede editar
    // el propio usuario, y el que la app móvil puede confiar para decidir
    // el tipo de cuenta.
    const { error: metadataError } = await ctx.supabaseAdmin.auth.admin.updateUserById(newUserId, {
      app_metadata: { role: 'coordinator' },
    });

    if (metadataError) {
      return errorResponse('unknown_error', 500);
    }

    // step 6 vincular
    const { error: linkError } = await ctx.supabaseAdmin
      .from('coordinators')
      .update({ user_id: newUserId })
      .eq('id', coordinator.id);

    if (linkError) {
      return errorResponse('unknown_error', 500);
    }

    return Response.json({ ok: true, email: coordinator.email });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Get a user access token (e.g. sign in via the app, or POST /auth/v1/token?grant_type=password)
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/invite-coordinator' \
    --header "Authorization: Bearer <user-access-token>" \
    --header 'Content-Type: application/json' \
    --data '{"coordinatorId":"<uuid>"}'

*/
