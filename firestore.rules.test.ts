/**
 * Security Rule Verification Matrix for AutoReforma (/orders/{orderId})
 * Maps each of the 12 adversarial payloads from security_spec.md to the
 * expected PERMISSION_DENIED outcome enforced by firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; emailVerified: boolean } | null;
  path: string;
  existingData?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcingGate: string;
}

const VALID_BASE_ORDER = {
  ownerId: 'user_a',
  licensePlate: '4821 KLP',
  orderDate: '2026-11-18',
  status: 'pendiente_laboratorio',
  vehicleBrand: 'Volkswagen',
  vehicleModel: 'Golf GTI',
  reformCodes: ['5.1', '4.4'],
  vehicleReforms: 'Instalación de suspensión roscada y llantas 19 pulgadas.',
  clientName: 'Carlos Mendoza',
  clientContact: 'carlos@ejemplo.es',
  labPrice: 180,
  finalPrice: 320,
  profit: 140,
  notes: '',
};

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Create',
    operation: 'create',
    auth: { uid: 'attacker_uid', emailVerified: true },
    path: '/orders/order_001',
    payload: { ...VALID_BASE_ORDER, ownerId: 'user_a' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidOrder -> data.ownerId == request.auth.uid',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Create',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_002',
    payload: { ...VALID_BASE_ORDER, isVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidOrder -> data.keys().hasOnly([...])',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Update',
    operation: 'update',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_001',
    existingData: VALID_BASE_ORDER,
    payload: { ...VALID_BASE_ORDER, ghostField: 'hack' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidOrder + affectedKeys().hasOnly([...])',
  },
  {
    id: 4,
    name: 'Unverified Email Bypass',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: false },
    path: '/orders/order_003',
    payload: VALID_BASE_ORDER,
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedUser -> request.auth.token.email_verified == true',
  },
  {
    id: 5,
    name: 'Owner Hijack on Update',
    operation: 'update',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_001',
    existingData: VALID_BASE_ORDER,
    payload: { ...VALID_BASE_ORDER, ownerId: 'user_b' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().ownerId == existing().ownerId',
  },
  {
    id: 6,
    name: 'Immortal Timestamp Tampering',
    operation: 'update',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_001',
    existingData: { ...VALID_BASE_ORDER, createdAt: 'T0' },
    payload: { ...VALID_BASE_ORDER, createdAt: 'T1' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == existing().createdAt',
  },
  {
    id: 7,
    name: 'Client-Spoofed Server Timestamp on Create',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_004',
    payload: { ...VALID_BASE_ORDER, createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == request.time',
  },
  {
    id: 8,
    name: 'Negative or Type-Poisoned Pricing Values',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_005',
    payload: { ...VALID_BASE_ORDER, labPrice: -100, finalPrice: '300' },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.labPrice is number && data.labPrice >= 0 && data.finalPrice is number',
  },
  {
    id: 9,
    name: 'Resource Poisoning via Oversized / Invalid Document ID',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: true },
    path: `/orders/${'a'.repeat(160)}`,
    payload: VALID_BASE_ORDER,
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidId(orderId)',
  },
  {
    id: 10,
    name: 'Value Poisoning on Whitelisted Status Key',
    operation: 'update',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_001',
    existingData: VALID_BASE_ORDER,
    payload: { ...VALID_BASE_ORDER, status: true },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'isValidOrder(incoming()) -> data.status is string && data.status in [...]',
  },
  {
    id: 11,
    name: 'Empty or Oversized Reform Codes Array',
    operation: 'create',
    auth: { uid: 'user_a', emailVerified: true },
    path: '/orders/order_006',
    payload: { ...VALID_BASE_ORDER, reformCodes: [] },
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'data.reformCodes.size() >= 1 && data.reformCodes.size() <= 20',
  },
  {
    id: 12,
    name: 'Cross-Tenant PII Read / Blanket List',
    operation: 'get',
    auth: { uid: 'user_b', emailVerified: true },
    path: '/orders/order_001',
    existingData: VALID_BASE_ORDER,
    expected: 'PERMISSION_DENIED',
    enforcingGate: 'existing().ownerId == request.auth.uid',
  },
];
