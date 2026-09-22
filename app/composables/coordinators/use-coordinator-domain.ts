import { CoordinatorInviteError } from '~/types/coordinator';

export function toCoordinatorInviteError(error: unknown): CoordinatorInviteError {
  const message = (error as { message?: string } | null)?.message;

  if (message === 'missing_coordinator_id') {
    return new CoordinatorInviteError('missing-coordinator-id', 'No se proporcionó un ID de coordinador válido.', { cause: error });
  }

  if (message === 'not_authorized') {
    return new CoordinatorInviteError('not-authorized', 'No tienes permiso para modificar el acceso de este coordinador.', { cause: error });
  }

  if (message === 'already_invited') {
    return new CoordinatorInviteError('already-invited', 'El coordinador ya ha sido invitado.', { cause: error });
  }

  if (message === 'missing_email') {
    return new CoordinatorInviteError('missing-email', 'El coordinador no tiene un correo electrónico registrado.', { cause: error });
  }

  if (message === 'cannot_invite_self') {
    return new CoordinatorInviteError('cannot-invite-self', 'No puedes invitarte a ti mismo.', { cause: error });
  }

  if (message === 'email_already_registered') {
    return new CoordinatorInviteError('email-already-registered', 'Ese correo electrónico ya está registrado con otra cuenta.', { cause: error });
  }

  return new CoordinatorInviteError('unknown-error', 'No se pudo completar la operación sobre el coordinador.', { cause: error });
}
