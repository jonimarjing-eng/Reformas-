import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  calculateProfit,
  normalizeOrderStatus,
  sanitizeOrderValues,
  validateOrderForm,
  type Order,
  type OrderFormValues,
  type OrderStatus,
} from '../types/order';
import { buildSampleOrders } from '../data/reformsCatalog';

const ORDERS_COLLECTION = 'orders';

export function subscribeToOrders(
  ownerId: string,
  onOrders: (orders: Order[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const items: Order[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const hasPersistedPricing =
          typeof data.labPrice === 'number' &&
          typeof data.finalPrice === 'number' &&
          typeof data.profit === 'number';
        const labPrice =
          typeof data.labPrice === 'number' && Number.isFinite(data.labPrice)
            ? data.labPrice
            : 0;
        const finalPrice =
          typeof data.finalPrice === 'number' && Number.isFinite(data.finalPrice)
            ? data.finalPrice
            : 0;
        const profit =
          typeof data.profit === 'number' && Number.isFinite(data.profit)
            ? data.profit
            : calculateProfit(labPrice, finalPrice);

        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          licensePlate: String(data.licensePlate ?? ''),
          orderDate: String(data.orderDate ?? ''),
          status: normalizeOrderStatus(data.status),
          vehicleBrand: String(data.vehicleBrand ?? ''),
          vehicleModel:
            typeof data.vehicleModel === 'string' ? data.vehicleModel : '',
          reformCodes: Array.isArray(data.reformCodes)
            ? data.reformCodes.map((c) => String(c))
            : [],
          vehicleReforms: String(data.vehicleReforms ?? ''),
          clientName: String(data.clientName ?? ''),
          clientContact:
            typeof data.clientContact === 'string' ? data.clientContact : '',
          labPrice,
          finalPrice,
          profit,
          hasPersistedPricing,
          notes: typeof data.notes === 'string' ? data.notes : '',
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });

      items.sort((a, b) => {
        const dateCmp = b.orderDate.localeCompare(a.orderDate);
        if (dateCmp !== 0) return dateCmp;
        const aSec = a.createdAt?.seconds ?? 0;
        const bSec = b.createdAt?.seconds ?? 0;
        return bSec - aSec;
      });

      onOrders(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createOrder(
  ownerId: string,
  values: OrderFormValues
): Promise<string> {
  const validationErrors = validateOrderForm(values);
  if (Object.keys(validationErrors).length > 0) {
    throw new Error(Object.values(validationErrors)[0]);
  }

  const sanitized = sanitizeOrderValues(values);
  const payload = {
    ownerId,
    licensePlate: sanitized.licensePlate,
    orderDate: sanitized.orderDate,
    status: sanitized.status,
    vehicleBrand: sanitized.vehicleBrand,
    vehicleModel: sanitized.vehicleModel,
    reformCodes: sanitized.reformCodes,
    vehicleReforms: sanitized.vehicleReforms,
    clientName: sanitized.clientName,
    clientContact: sanitized.clientContact,
    labPrice: sanitized.labPrice,
    finalPrice: sanitized.finalPrice,
    profit: sanitized.profit,
    notes: sanitized.notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ORDERS_COLLECTION);
  }
}

export async function updateOrder(
  orderId: string,
  values: OrderFormValues
): Promise<void> {
  const validationErrors = validateOrderForm(values);
  if (Object.keys(validationErrors).length > 0) {
    throw new Error(Object.values(validationErrors)[0]);
  }

  const sanitized = sanitizeOrderValues(values);
  const docPath = `${ORDERS_COLLECTION}/${orderId}`;

  try {
    await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
      licensePlate: sanitized.licensePlate,
      orderDate: sanitized.orderDate,
      status: sanitized.status,
      vehicleBrand: sanitized.vehicleBrand,
      vehicleModel: sanitized.vehicleModel,
      reformCodes: sanitized.reformCodes,
      vehicleReforms: sanitized.vehicleReforms,
      clientName: sanitized.clientName,
      clientContact: sanitized.clientContact,
      labPrice: sanitized.labPrice,
      finalPrice: sanitized.finalPrice,
      profit: sanitized.profit,
      notes: sanitized.notes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function updateOrderStatus(
  order: Order,
  status: OrderStatus
): Promise<void> {
  const docPath = `${ORDERS_COLLECTION}/${order.id}`;
  const patch = order.hasPersistedPricing
    ? {
        status,
        updatedAt: serverTimestamp(),
      }
    : {
        status,
        labPrice: order.labPrice,
        finalPrice: order.finalPrice,
        profit: order.profit,
        updatedAt: serverTimestamp(),
      };

  try {
    await updateDoc(doc(db, ORDERS_COLLECTION, order.id), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  const docPath = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function seedSampleOrders(
  ownerId: string,
  todayIso: string
): Promise<void> {
  const samples = buildSampleOrders(todayIso);
  for (const sample of samples) {
    await createOrder(ownerId, sample);
  }
}
