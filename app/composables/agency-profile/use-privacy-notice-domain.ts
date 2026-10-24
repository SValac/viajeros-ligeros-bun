import { z } from 'zod';

import type { PrivacyNotice, PrivacyNoticeSection } from '~/types/agency-profile';
import type { Json } from '~/types/database.types';

import { CONTACT_EMAIL_MAX_LENGTH } from '~/composables/agency-profile/use-agency-profile-domain';
import {
  asRecord,
  asString,
  cleanLine,
  cleanText,
  requiredLine,
  requiredText,
} from '~/composables/agency-profile/use-page-sections-domain';
import { todayISO } from '~/utils/format-date';

// Privacy notice contract shared with the public site (viajeros-ligeros-web), which
// re-validates on read and renders /aviso-de-privacidad. A body splits into paragraphs on
// line breaks (empty lines are ignored) and consecutive lines starting with "- " form a
// list. The structural part and the required fields are also enforced by the
// agency_profiles_privacy_notice_valid CHECK in 20261024174806_agency_privacy_notice.sql.
export const PRIVACY_NOTICE_LIMITS = {
  legalName: 200,
  address: 400,
  sectionTitle: 120,
  sectionBody: 6000,
  sections: 20,
} as const;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const privacyNoticeSectionSchema = z.object({
  title: requiredLine(PRIVACY_NOTICE_LIMITS.sectionTitle),
  body: requiredText(PRIVACY_NOTICE_LIMITS.sectionBody),
});

/**
 * Validates the privacy notice editor state. Every field is required: the site only shows
 * a complete notice. With these limits a notice stays well under the database's 256 KB
 * cap, so size is not checked here.
 */
export const privacyNoticeSchema = z.object({
  responsible: z.object({
    legalName: requiredLine(PRIVACY_NOTICE_LIMITS.legalName),
    address: requiredLine(PRIVACY_NOTICE_LIMITS.address),
    arcoEmail: z.string()
      .trim()
      .min(1, 'Este campo es obligatorio')
      .max(CONTACT_EMAIL_MAX_LENGTH, `Máximo ${CONTACT_EMAIL_MAX_LENGTH} caracteres`)
      .refine(value => z.email().safeParse(value).success, 'Email inválido'),
  }),
  updatedOn: z.string().regex(DATE_ONLY_REGEX, 'Elige la fecha de la última actualización'),
  sections: z.array(privacyNoticeSectionSchema)
    .min(1, 'Agrega al menos una sección')
    .max(PRIVACY_NOTICE_LIMITS.sections, `Máximo ${PRIVACY_NOTICE_LIMITS.sections} secciones`),
});

/**
 * Converts the editor state into the JSON stored in `agency_profiles.privacy_notice`:
 * trims texts, strips control characters and normalizes paragraphs.
 * @param notice - Editor state, or `null` when the agency has no notice
 * @returns JSON for the `privacy_notice` column, or `null`
 */
export function serializePrivacyNotice(notice: PrivacyNotice | null): Json | null {
  if (!notice)
    return null;

  return {
    responsible: {
      legal_name: cleanLine(notice.responsible.legalName),
      address: cleanLine(notice.responsible.address),
      arco_email: cleanLine(notice.responsible.arcoEmail),
    },
    updated_on: notice.updatedOn,
    sections: notice.sections.map(section => ({
      title: cleanLine(section.title),
      body: cleanText(section.body),
    })),
  };
}

/**
 * Reads the stored `privacy_notice` JSON into editor state, filling missing texts with
 * `''`. Lenient on purpose: whatever is stored is shown for editing, and the form schema
 * flags anything that no longer fits the contract.
 * @param json - Value of `agency_profiles.privacy_notice`
 * @returns Editor state, or `null` when the agency has no notice
 */
export function toPrivacyNotice(json: Json | null): PrivacyNotice | null {
  if (!json || typeof json !== 'object' || Array.isArray(json))
    return null;

  const responsible = asRecord(json.responsible);
  const sections = Array.isArray(json.sections) ? json.sections : [];
  return {
    responsible: {
      legalName: asString(responsible.legal_name),
      address: asString(responsible.address),
      arcoEmail: asString(responsible.arco_email),
    },
    updatedOn: asString(json.updated_on),
    sections: sections.map((value) => {
      const section = asRecord(value);
      return { title: asString(section.title), body: asString(section.body) };
    }),
  };
}

/**
 * Deep-copies a stored notice into independent editor state, so edits don't touch the
 * store until they are saved.
 * @param notice - The profile's notice (may be a reactive proxy), or `null`
 * @returns A plain copy, or `null`
 */
export function clonePrivacyNotice(notice: PrivacyNotice | null): PrivacyNotice | null {
  return notice ? structuredClone(toRaw(notice)) : null;
}

export function createPrivacyNoticeSection(): PrivacyNoticeSection {
  return { title: '', body: '' };
}

/**
 * Creates an empty notice dated today, with one section to fill in.
 * @param contactEmail - The agency's contact email, suggested for ARCO requests
 * @returns A new notice ready to edit
 */
export function createEmptyPrivacyNotice(contactEmail: string): PrivacyNotice {
  return {
    responsible: { legalName: '', address: '', arcoEmail: contactEmail },
    updatedOn: todayISO(),
    sections: [createPrivacyNoticeSection()],
  };
}

/**
 * Example notice for the public site as it works today: no forms or accounts, contact
 * through WhatsApp, the Meta Pixel for ads, and Vercel/Supabase as providers. Text written
 * with the web repo (viajeros-ligeros-web docs/aviso-de-privacidad-borrador.md). A starting
 * point the agency must review and adapt, not legal advice. The site shows the responsible
 * party (name, address, ARCO email) apart, so the texts call it "el correo de contacto de
 * este aviso" instead of repeating it.
 * @param contactEmail - The agency's contact email, suggested for ARCO requests
 * @returns A complete notice except for the responsible party's legal name and address
 */
export function createPrivacyNoticeTemplate(contactEmail: string): PrivacyNotice {
  return {
    responsible: { legalName: '', address: '', arcoEmail: contactEmail },
    updatedOn: todayISO(),
    sections: [
      {
        title: 'Alcance de este aviso',
        body: [
          'Este aviso explica cómo tratamos los datos personales de quienes visitan este sitio web y de quienes nos contactan desde él. Lo emitimos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
          'Este sitio no tiene formularios ni cuentas de usuario: no te pedimos que escribas tus datos en él. Cuando quieres información o reservar un viaje, te llevamos a WhatsApp.',
        ].join('\n'),
      },
      {
        title: 'Datos personales que tratamos',
        body: [
          'Cuando navegas por el sitio se obtienen de forma automática:',
          '- Tu dirección IP, el tipo de navegador y de dispositivo, y su sistema operativo.',
          '- Las páginas que visitas, los viajes que consultas y la fecha y hora de la visita.',
          '- Los identificadores de las cookies de Meta (Facebook e Instagram).',
          'Si nos escribes por WhatsApp, tratamos los datos que tú nos compartas en esa conversación, como tu nombre, tu número de teléfono y el viaje que te interesa.',
          'No tratamos datos personales sensibles.',
        ].join('\n'),
      },
      {
        title: 'Para qué usamos tus datos',
        body: [
          'Usamos tus datos para estas finalidades, necesarias para atenderte:',
          '- Mostrarte el sitio y mantenerlo funcionando y seguro.',
          '- Responder tus preguntas y tus solicitudes de información o de reserva por WhatsApp.',
          'Y para estas finalidades secundarias, que no son necesarias para atenderte:',
          '- Medir cuántas personas visitan el sitio, qué viajes consultan y cuántas nos contactan.',
          '- Mostrar anuncios de nuestros viajes en Facebook e Instagram a personas que visitaron el sitio o que podrían interesarse en ellos.',
          'Si no quieres que usemos tus datos para las finalidades secundarias, desactiva las cookies y la publicidad personalizada como se explica en la sección «Cómo desactivar las cookies y la publicidad personalizada», o escríbenos al correo de contacto de este aviso. Negarte no cambia la atención que te damos.',
        ].join('\n'),
      },
      {
        title: 'Cookies y tecnologías de rastreo',
        body: [
          'Este sitio usa el Píxel de Meta, una herramienta de Meta Platforms que guarda cookies en tu navegador y le avisa a Meta cuando:',
          '- Ves una página del sitio.',
          '- Consultas un viaje, junto con el nombre del viaje.',
          '- Tocas un botón de WhatsApp para contactarnos.',
          'Con cada aviso, Meta recibe tu dirección IP, los datos de tu navegador y los identificadores de sus cookies. No le enviamos tu nombre, tu correo ni tu teléfono.',
          'Meta también usa esta información para sus propios fines, como mejorar sus anuncios, y puede relacionarla con tu cuenta de Facebook o Instagram si tienes una. Puedes consultar cómo lo hace en su Política de privacidad: facebook.com/privacy/policy',
          'El sitio también puede guardar en tu navegador preferencias técnicas, como el modo claro u oscuro, que no te identifican.',
        ].join('\n'),
      },
      {
        title: 'Cómo desactivar las cookies y la publicidad personalizada',
        body: [
          '- En tu navegador: borra o bloquea las cookies desde su configuración de privacidad, o usa la navegación privada o un bloqueador de rastreo. El sitio sigue funcionando sin cookies.',
          '- En Facebook o Instagram: en el Centro de cuentas, entra a Preferencias de anuncios y desactiva el uso de la información de los socios publicitarios para mostrarte anuncios.',
          '- En iPhone: en Ajustes › Privacidad y seguridad › Rastreo, desactiva «Permitir que las apps soliciten rastrearte».',
          '- En Android: en Ajustes › Google › Anuncios, elimina tu ID de publicidad.',
        ].join('\n'),
      },
      {
        title: 'Con quién compartimos tus datos',
        body: [
          'Para operar el sitio usamos proveedores que tratan datos por cuenta nuestra y solo para darnos su servicio:',
          '- Vercel Inc., que aloja el sitio y guarda por un tiempo limitado registros técnicos de las visitas (dirección IP, navegador, página, fecha y hora) para operar y proteger el servicio.',
          '- Supabase Inc., que guarda el contenido del sitio, como los viajes y sus imágenes.',
          '- WhatsApp, de Meta Platforms, por donde recibimos y respondemos tus mensajes.',
          'Estos proveedores pueden tratar los datos fuera de México.',
          'Meta Platforms recibe además los datos del Píxel de Meta para medir y mostrar nuestros anuncios, como se explica en «Cookies y tecnologías de rastreo».',
          'No vendemos tus datos personales. Fuera de estos casos, solo los compartiríamos cuando una ley o una autoridad competente lo exija.',
        ].join('\n'),
      },
      {
        title: 'Cuánto tiempo conservamos tus datos',
        body: 'Conservamos tus datos solo mientras los necesitamos para las finalidades de este aviso, o durante el tiempo que nos obligue la ley. Después los eliminamos.',
      },
      {
        title: 'Tus derechos ARCO y cómo ejercerlos',
        body: [
          'Tienes derecho a saber qué datos tenemos de ti y para qué los usamos (acceso), a pedir que los corrijamos si están mal (rectificación), a pedir que los eliminemos (cancelación) y a oponerte a que los usemos para ciertos fines (oposición). También puedes revocar tu consentimiento o pedirnos que limitemos el uso de tus datos.',
          'Para hacerlo, escríbenos al correo de contacto de este aviso con:',
          '- Tu nombre y un medio para responderte.',
          '- Un documento que acredite tu identidad o, si alguien actúa por ti, el de tu representante y el documento que lo autoriza.',
          '- Qué derecho quieres ejercer y sobre qué datos.',
          '- Cualquier dato que nos ayude a encontrarlos, como el número de WhatsApp desde el que nos escribiste.',
          'Te responderemos en un máximo de 20 días hábiles desde que recibamos tu solicitud. Si procede, la haremos efectiva dentro de los 15 días hábiles siguientes.',
          'Los datos que Meta obtiene con sus cookies los trata Meta: para limitarlos, usa las opciones de «Cómo desactivar las cookies y la publicidad personalizada».',
          'Si consideras que no atendimos bien tu solicitud, puedes acudir a la autoridad en materia de protección de datos personales.',
        ].join('\n'),
      },
      {
        title: 'Cambios a este aviso',
        body: 'Podemos actualizar este aviso, por ejemplo cuando agreguemos nuevas formas de reservar o de pagar. Publicaremos cualquier cambio en esta página, con su nueva fecha de actualización.',
      },
    ],
  };
}
