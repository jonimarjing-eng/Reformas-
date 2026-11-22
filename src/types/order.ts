import type { Timestamp } from 'firebase/firestore';

export type OrderStatus =
  | 'pendiente_laboratorio'
  | 'pendiente_cliente'
  | 'pendiente_modificacion_vplus'
  | 'pendiente_itv'
  | 'rechazado_itv'
  | 'pendiente_cobrar'
  | 'terminado'
  | 'cancelado';

export const VALID_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  'pendiente_laboratorio',
  'pendiente_cliente',
  'pendiente_modificacion_vplus',
  'pendiente_itv',
  'rechazado_itv',
  'pendiente_cobrar',
  'terminado',
  'cancelado',
];

export const TERMINAL_STATUSES: ReadonlyArray<OrderStatus> = [
  'terminado',
  'cancelado',
];

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function normalizeOrderStatus(raw: unknown): OrderStatus {
  if (typeof raw === 'string' && VALID_ORDER_STATUSES.includes(raw as OrderStatus)) {
    return raw as OrderStatus;
  }
  switch (raw) {
    case 'esperando_itv':
      return 'pendiente_itv';
    case 'completado':
      return 'terminado';
    case 'en_revision':
      return 'pendiente_cliente';
    case 'en_proceso':
      return 'pendiente_laboratorio';
    default:
      return 'pendiente_laboratorio';
  }
}

export interface Order {
  id: string;
  ownerId: string;
  licensePlate: string;
  orderDate: string; // YYYY-MM-DD
  status: OrderStatus;
  vehicleBrand: string;
  vehicleModel?: string;
  reformCodes: string[];
  vehicleReforms: string;
  clientName: string;
  clientContact?: string;
  labPrice: number;
  finalPrice: number;
  profit: number;
  hasPersistedPricing?: boolean;
  notes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface OrderFormValues {
  licensePlate: string;
  orderDate: string;
  status: OrderStatus;
  vehicleBrand: string;
  vehicleModel: string;
  reformCodes: string[];
  vehicleReforms: string;
  clientName: string;
  clientContact: string;
  labPrice: string;
  finalPrice: string;
  notes: string;
}

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const ORDER_VALIDATION = {
  LICENSE_PLATE_MIN: 2,
  LICENSE_PLATE_MAX: 20,
  LICENSE_PLATE_REGEX: /^[A-Z0-9 \-]+$/,
  ORDER_DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  BRAND_MIN: 1,
  BRAND_MAX: 80,
  MODEL_MAX: 80,
  REFORM_CODES_MIN: 1,
  REFORM_CODES_MAX: 20,
  REFORM_CODE_ITEM_MAX: 20,
  REFORMS_MIN: 2,
  REFORMS_MAX: 1500,
  CLIENT_NAME_MIN: 1,
  CLIENT_NAME_MAX: 120,
  CLIENT_CONTACT_MAX: 120,
  PRICE_MIN: 0,
  PRICE_MAX: 1000000,
  NOTES_MAX: 1000,
} as const;

export function parsePriceInput(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return Number.NaN;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}

export function calculateProfit(labPrice: number, finalPrice: number): number {
  return Math.round((finalPrice - labPrice) * 100) / 100;
}

export function formatCurrencyEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function normalizeLicensePlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ORDER_VALIDATION.LICENSE_PLATE_MAX);
}

export function normalizeReformCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim()
    .slice(0, ORDER_VALIDATION.REFORM_CODE_ITEM_MAX);
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ValidationErrors {
  licensePlate?: string;
  orderDate?: string;
  status?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  reformCodes?: string;
  vehicleReforms?: string;
  clientName?: string;
  clientContact?: string;
  labPrice?: string;
  finalPrice?: string;
  notes?: string;
}

export function validateOrderForm(values: OrderFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  const plate = normalizeLicensePlate(values.licensePlate);

  if (
    plate.length < ORDER_VALIDATION.LICENSE_PLATE_MIN ||
    plate.length > ORDER_VALIDATION.LICENSE_PLATE_MAX ||
    !ORDER_VALIDATION.LICENSE_PLATE_REGEX.test(plate)
  ) {
    errors.licensePlate =
      'Introduce una matrícula válida (2 a 20 caracteres: letras, números, espacios o guiones).';
  }

  if (!ORDER_VALIDATION.ORDER_DATE_REGEX.test(values.orderDate)) {
    errors.orderDate = 'Selecciona una fecha de creación válida (AAAA-MM-DD).';
  }

  if (!VALID_ORDER_STATUSES.includes(values.status)) {
    errors.status = 'Selecciona un estado válido.';
  }

  const brand = values.vehicleBrand.trim();
  if (
    brand.length < ORDER_VALIDATION.BRAND_MIN ||
    brand.length > ORDER_VALIDATION.BRAND_MAX
  ) {
    errors.vehicleBrand = `Indica la marca del vehículo (máx. ${ORDER_VALIDATION.BRAND_MAX} caracteres).`;
  }

  if (values.vehicleModel.trim().length > ORDER_VALIDATION.MODEL_MAX) {
    errors.vehicleModel = `El modelo no puede superar los ${ORDER_VALIDATION.MODEL_MAX} caracteres.`;
  }

  const cleanCodes = values.reformCodes
    .map(normalizeReformCode)
    .filter((c) => c.length > 0);
  if (cleanCodes.length < ORDER_VALIDATION.REFORM_CODES_MIN) {
    errors.reformCodes = 'Añade al menos un código de reforma (ej. 5.1, 4.4).';
  } else if (cleanCodes.length > ORDER_VALIDATION.REFORM_CODES_MAX) {
    errors.reformCodes = `Máximo ${ORDER_VALIDATION.REFORM_CODES_MAX} códigos de reforma por pedido.`;
  }

  const reforms = values.vehicleReforms.trim();
  if (reforms.length < ORDER_VALIDATION.REFORMS_MIN) {
    errors.vehicleReforms =
      'Describe las reformas del vehículo (mínimo 2 caracteres).';
  } else if (reforms.length > ORDER_VALIDATION.REFORMS_MAX) {
    errors.vehicleReforms = `La descripción no puede superar los ${ORDER_VALIDATION.REFORMS_MAX} caracteres.`;
  }

  const client = values.clientName.trim();
  if (
    client.length < ORDER_VALIDATION.CLIENT_NAME_MIN ||
    client.length > ORDER_VALIDATION.CLIENT_NAME_MAX
  ) {
    errors.clientName = `Indica el nombre del cliente (máx. ${ORDER_VALIDATION.CLIENT_NAME_MAX} caracteres).`;
  }

  if (values.clientContact.trim().length > ORDER_VALIDATION.CLIENT_CONTACT_MAX) {
    errors.clientContact = `El contacto no puede superar los ${ORDER_VALIDATION.CLIENT_CONTACT_MAX} caracteres.`;
  }

  const labPrice = parsePriceInput(values.labPrice);
  if (
    Number.isNaN(labPrice) ||
    labPrice < ORDER_VALIDATION.PRICE_MIN ||
    labPrice > ORDER_VALIDATION.PRICE_MAX
  ) {
    errors.labPrice = 'Introduce un precio de laboratorio válido (0 o superior).';
  }

  const finalPrice = parsePriceInput(values.finalPrice);
  if (
    Number.isNaN(finalPrice) ||
    finalPrice < ORDER_VALIDATION.PRICE_MIN ||
    finalPrice > ORDER_VALIDATION.PRICE_MAX
  ) {
    errors.finalPrice = 'Introduce un precio final válido (0 o superior).';
  }

  if (values.notes.trim().length > ORDER_VALIDATION.NOTES_MAX) {
    errors.notes = `Las observaciones no pueden superar los ${ORDER_VALIDATION.NOTES_MAX} caracteres.`;
  }

  return errors;
}

export function sanitizeOrderValues(values: OrderFormValues): {
  licensePlate: string;
  orderDate: string;
  status: OrderStatus;
  vehicleBrand: string;
  vehicleModel: string;
  reformCodes: string[];
  vehicleReforms: string;
  clientName: string;
  clientContact: string;
  labPrice: number;
  finalPrice: number;
  profit: number;
  notes: string;
} {
  const uniqueCodes = Array.from(
    new Set(
      values.reformCodes
        .map(normalizeReformCode)
        .filter((c) => c.length > 0)
    )
  ).slice(0, ORDER_VALIDATION.REFORM_CODES_MAX);

  const labPrice = Math.min(
    ORDER_VALIDATION.PRICE_MAX,
    Math.max(ORDER_VALIDATION.PRICE_MIN, parsePriceInput(values.labPrice) || 0)
  );
  const finalPrice = Math.min(
    ORDER_VALIDATION.PRICE_MAX,
    Math.max(ORDER_VALIDATION.PRICE_MIN, parsePriceInput(values.finalPrice) || 0)
  );
  const profit = calculateProfit(labPrice, finalPrice);

  return {
    licensePlate: normalizeLicensePlate(values.licensePlate),
    orderDate: values.orderDate.trim().slice(0, 10),
    status: normalizeOrderStatus(values.status),
    vehicleBrand: values.vehicleBrand.trim().slice(0, ORDER_VALIDATION.BRAND_MAX),
    vehicleModel: values.vehicleModel.trim().slice(0, ORDER_VALIDATION.MODEL_MAX),
    reformCodes: uniqueCodes,
    vehicleReforms: values.vehicleReforms
      .trim()
      .slice(0, ORDER_VALIDATION.REFORMS_MAX),
    clientName: values.clientName
      .trim()
      .slice(0, ORDER_VALIDATION.CLIENT_NAME_MAX),
    clientContact: values.clientContact
      .trim()
      .slice(0, ORDER_VALIDATION.CLIENT_CONTACT_MAX),
    labPrice,
    finalPrice,
    profit,
    notes: values.notes.trim().slice(0, ORDER_VALIDATION.NOTES_MAX),
  };
}
