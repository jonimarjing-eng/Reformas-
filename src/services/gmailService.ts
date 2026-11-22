import { ORDER_STATUS_MAP } from '../data/reformsCatalog';
import { formatCurrencyEur, type Order, type OrderStatus } from '../types/order';
import { clearCachedGmailAccessToken } from '../lib/firebase';

export class GmailAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailAuthError';
  }
}

const EMAIL_EXTRACT_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EMAIL_VALID_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function extractEmailFromContact(contact?: string): string {
  if (!contact) return '';
  const match = contact.match(EMAIL_EXTRACT_REGEX);
  return match ? match[0].trim() : '';
}

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_VALID_REGEX.test(email.trim());
}

function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encodeUtf8ToBase64Url(text: string): string {
  return encodeUtf8ToBase64(text)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodeRfc2047Subject(subject: string): string {
  return `=?UTF-8?B?${encodeUtf8ToBase64(subject)}?=`;
}

function buildStatusSpecificNote(order: Order, status: OrderStatus): string {
  switch (status) {
    case 'pendiente_laboratorio':
      return 'Tu expediente ya está en manos del laboratorio para la emisión del informe de conformidad correspondiente. Te avisaremos en cuanto recibamos la documentación.';
    case 'pendiente_cliente':
      return 'Necesitamos documentación adicional o confirmación por tu parte para poder continuar con la tramitación de la reforma. Por favor, responde a este correo o ponte en contacto con nosotros.';
    case 'pendiente_modificacion_vplus':
      return 'Estamos realizando las modificaciones técnicas necesarias en el expediente (VPlus) para dejar toda la documentación preparada correctamente.';
    case 'pendiente_itv':
      return 'La documentación de tu reforma ya está preparada. El siguiente paso es acudir a la estación de ITV para completar la inspección e inscripción en la ficha técnica.';
    case 'rechazado_itv':
      return 'Hemos registrado que la inspección en ITV ha resultado desfavorable. Vamos a revisar los puntos indicados para subsanarlos cuanto antes; responde a este correo con el informe de la ITV si aún no nos lo has enviado.';
    case 'pendiente_cobrar':
      return `La tramitación de tu reforma está lista y queda pendiente de abono (importe final: ${formatCurrencyEur(order.finalPrice)}). Por favor, contáctanos para completar el pago y finalizar el expediente.`;
    case 'terminado':
      return 'Tu expediente de reforma ha quedado finalizado correctamente. Gracias por confiar en nosotros.';
    case 'cancelado':
      return 'Te confirmamos que el pedido de reforma ha quedado cancelado según lo acordado. Si necesitas retomarlo más adelante, estamos a tu disposición.';
  }
}

export function buildStatusEmailDraft(
  order: Order,
  statusOverride?: OrderStatus
): { to: string; subject: string; body: string } {
  const status = statusOverride ?? order.status;
  const statusMeta = ORDER_STATUS_MAP[status];
  const vehicleDesc = order.vehicleModel
    ? `${order.vehicleBrand} ${order.vehicleModel}`
    : order.vehicleBrand;

  const to = extractEmailFromContact(order.clientContact);
  const subject = `Actualización de tu reforma (${order.licensePlate}) — ${statusMeta.label}`;

  const lines = [
    `Hola ${order.clientName},`,
    '',
    `Te informamos de que el estado del expediente de reforma de tu vehículo ha sido actualizado:`,
    '',
    `• Matrícula: ${order.licensePlate}`,
    `• Vehículo: ${vehicleDesc}`,
    `• Estado actual: ${statusMeta.label}`,
    `• Códigos de reforma: ${order.reformCodes.join(', ')}`,
    `• Reformas: ${order.vehicleReforms}`,
    '',
    buildStatusSpecificNote(order, status),
    '',
    'Si tienes cualquier duda, puedes responder directamente a este correo.',
    '',
    'Un saludo,',
    'AutoReforma',
  ];

  return {
    to,
    subject,
    body: lines.join('\n'),
  };
}

export async function sendGmailMessage(params: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const cleanTo = params.to.trim();
  const cleanSubject = params.subject.trim();
  const cleanBody = params.body.trim();

  if (!isValidEmailAddress(cleanTo)) {
    throw new Error('Introduce una dirección de correo electrónico válida.');
  }
  if (!cleanSubject) {
    throw new Error('El asunto del correo no puede estar vacío.');
  }
  if (!cleanBody) {
    throw new Error('El cuerpo del mensaje no puede estar vacío.');
  }

  const mimeMessage = [
    `To: ${cleanTo}`,
    `Subject: ${encodeRfc2047Subject(cleanSubject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeUtf8ToBase64(cleanBody),
  ].join('\r\n');

  const raw = encodeUtf8ToBase64Url(mimeMessage);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (response.status === 401 || response.status === 403) {
    clearCachedGmailAccessToken();
    throw new GmailAuthError(
      'Tu sesión de envío con Gmail ha expirado o requiere permiso adicional. Vuelve a conectar tu cuenta de Google para enviar el correo.'
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message ?? '';
    } catch {
      detail = '';
    }
    throw new Error(
      detail
        ? `Error de Gmail al enviar el correo: ${detail}`
        : 'No se pudo enviar el correo a través de Gmail. Inténtalo de nuevo.'
    );
  }

  const data = (await response.json()) as { id?: string };
  return { id: data.id ?? '' };
}
