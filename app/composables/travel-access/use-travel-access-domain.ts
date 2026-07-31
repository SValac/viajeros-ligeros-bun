import { TravelAccessCodeError } from '~/types/travel-access';

const DEFAULT_COUNTRY_CODE = '52'; // default to mexico

export function toTravelAccessCodeError(error: unknown): TravelAccessCodeError {
  const message = (error as { message?: string } | null)?.message;

  if (message === 'code_generation_conflict') {
    return new TravelAccessCodeError('code-generation-conflict', 'Ocurrió un conflicto al generar el código. Intenta de nuevo.', { cause: error });
  }

  if (message === 'no_active_code') {
    return new TravelAccessCodeError('no-active-code', 'Este viaje no tiene un código de acceso activo para revocar.', { cause: error });
  }

  if (message === 'not_authorized') {
    return new TravelAccessCodeError('not-authorized', 'No tienes permiso para gestionar el código de acceso de este viaje.', { cause: error });
  }

  if (message === 'travel_not_eligible') {
    return new TravelAccessCodeError('travel-not-eligible', 'El viaje debe estar publicado o en curso para generar un código de acceso.', { cause: error });
  }

  if (message === 'travel_not_found') {
    return new TravelAccessCodeError('travel-not-found', 'No se encontró el viaje indicado.', { cause: error });
  }

  return new TravelAccessCodeError('unknown-error', 'No se pudo completar la operación del código de acceso.', { cause: error });
}

export function buildWhatsAppShareUrl(phone: string, code: string, travelLabel: string): string {
  let digits = phone.match(/\d/g)?.join('');

  if (digits?.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  const message = `Tu código de acceso para ${travelLabel} es: ${code}. Ingresa en la app junto con tu numero de teléfono.`;
  const text = encodeURIComponent(message);

  return `https://wa.me/${digits}?text=${text}`;
}
