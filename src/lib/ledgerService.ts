import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  MAX_AMOUNT_VALUE,
  MAX_ITEM_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_SHOP_NAME_LENGTH,
  PURCHASE_CATEGORIES,
  type PaymentMethod,
  type PurchaseCategory,
  type PurchaseRecord,
  type SaleRecord,
  type ShopSettings,
} from '../types/ledger';

export interface SaleInput {
  date: string;
  note: string;
  cashAmount: number;
  krungthaiAmount: number;
}

export interface PurchaseInput {
  date: string;
  itemName: string;
  category: PurchaseCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  note: string;
}

export interface ShopSettingsInput {
  shopName: string;
  initialCashBalance: number;
  initialKrungthaiBalance: number;
}

function sanitizeNumber(value: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.round(num * 100) / 100, max);
}

function validateDateStr(date: string): string {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
  }
  return trimmed;
}

export function subscribeToSales(
  uid: string,
  onData: (sales: SaleRecord[]) => void
): Unsubscribe {
  const path = 'sales';
  const q = query(
    collection(db, path),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SaleRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId ?? ''),
            date: String(data.date ?? ''),
            note: String(data.note ?? ''),
            cashAmount: Number(data.cashAmount ?? 0),
            krungthaiAmount: Number(data.krungthaiAmount ?? 0),
            totalAmount: Number(data.totalAmount ?? 0),
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        })
        .sort((a, b) => {
          const dateCmp = b.date.localeCompare(a.date);
          if (dateCmp !== 0) return dateCmp;
          const aMs = a.createdAt ? a.createdAt.toMillis() : 0;
          const bMs = b.createdAt ? b.createdAt.toMillis() : 0;
          return bMs - aMs;
        });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToPurchases(
  uid: string,
  onData: (purchases: PurchaseRecord[]) => void
): Unsubscribe {
  const path = 'purchases';
  const q = query(
    collection(db, path),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PurchaseRecord[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const rawCat = String(data.category ?? 'วัตถุดิบ') as PurchaseCategory;
          const category = PURCHASE_CATEGORIES.includes(rawCat) ? rawCat : 'อื่นๆ';
          const paymentMethod: PaymentMethod =
            data.paymentMethod === 'krungthai' ? 'krungthai' : 'cash';
          return {
            id: d.id,
            ownerId: String(data.ownerId ?? ''),
            date: String(data.date ?? ''),
            itemName: String(data.itemName ?? ''),
            category,
            paymentMethod,
            amount: Number(data.amount ?? 0),
            note: String(data.note ?? ''),
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        })
        .sort((a, b) => {
          const dateCmp = b.date.localeCompare(a.date);
          if (dateCmp !== 0) return dateCmp;
          const aMs = a.createdAt ? a.createdAt.toMillis() : 0;
          const bMs = b.createdAt ? b.createdAt.toMillis() : 0;
          return bMs - aMs;
        });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToShopSettings(
  uid: string,
  onData: (settings: ShopSettings | null) => void
): Unsubscribe {
  const path = `shopSettings/${uid}`;
  return onSnapshot(
    doc(db, 'shopSettings', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        ownerId: String(data.ownerId ?? uid),
        shopName: String(data.shopName ?? 'ร้านหมาล่าทอด หลังเกษราษฎร์'),
        initialCashBalance: Number(data.initialCashBalance ?? 0),
        initialKrungthaiBalance: Number(data.initialKrungthaiBalance ?? 0),
        updatedAt: data.updatedAt ?? null,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createSale(uid: string, input: SaleInput): Promise<void> {
  const date = validateDateStr(input.date);
  const cashAmount = sanitizeNumber(input.cashAmount, MAX_AMOUNT_VALUE);
  const krungthaiAmount = sanitizeNumber(input.krungthaiAmount, MAX_AMOUNT_VALUE);
  const totalAmount = Math.round((cashAmount + krungthaiAmount) * 100) / 100;
  if (totalAmount <= 0) {
    throw new Error('กรุณาระบุยอดเงินสดหรือยอดโอนกรุงไทยอย่างน้อย 1 บาท');
  }
  const note = input.note.trim().slice(0, MAX_NOTE_LENGTH);

  const path = 'sales';
  try {
    await addDoc(collection(db, path), {
      ownerId: uid,
      date,
      note,
      cashAmount,
      krungthaiAmount,
      totalAmount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSale(
  saleId: string,
  input: SaleInput
): Promise<void> {
  const date = validateDateStr(input.date);
  const cashAmount = sanitizeNumber(input.cashAmount, MAX_AMOUNT_VALUE);
  const krungthaiAmount = sanitizeNumber(input.krungthaiAmount, MAX_AMOUNT_VALUE);
  const totalAmount = Math.round((cashAmount + krungthaiAmount) * 100) / 100;
  if (totalAmount <= 0) {
    throw new Error('กรุณาระบุยอดเงินสดหรือยอดโอนกรุงไทยอย่างน้อย 1 บาท');
  }
  const note = input.note.trim().slice(0, MAX_NOTE_LENGTH);

  const path = `sales/${saleId}`;
  try {
    await updateDoc(doc(db, 'sales', saleId), {
      date,
      note,
      cashAmount,
      krungthaiAmount,
      totalAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSale(saleId: string): Promise<void> {
  const path = `sales/${saleId}`;
  try {
    await deleteDoc(doc(db, 'sales', saleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createPurchase(
  uid: string,
  input: PurchaseInput
): Promise<void> {
  const date = validateDateStr(input.date);
  const itemName = input.itemName.trim().slice(0, MAX_ITEM_NAME_LENGTH);
  if (!itemName) {
    throw new Error('กรุณาระบุชื่อรายการซื้อของ');
  }
  const category = PURCHASE_CATEGORIES.includes(input.category)
    ? input.category
    : 'อื่นๆ';
  const paymentMethod: PaymentMethod =
    input.paymentMethod === 'krungthai' ? 'krungthai' : 'cash';
  const amount = sanitizeNumber(input.amount, MAX_AMOUNT_VALUE);
  if (amount <= 0) {
    throw new Error('กรุณาระบุจำนวนเงินที่จ่ายมากกว่า 0 บาท');
  }
  const note = input.note.trim().slice(0, MAX_NOTE_LENGTH);

  const path = 'purchases';
  try {
    await addDoc(collection(db, path), {
      ownerId: uid,
      date,
      itemName,
      category,
      paymentMethod,
      amount,
      note,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePurchase(
  purchaseId: string,
  input: PurchaseInput
): Promise<void> {
  const date = validateDateStr(input.date);
  const itemName = input.itemName.trim().slice(0, MAX_ITEM_NAME_LENGTH);
  if (!itemName) {
    throw new Error('กรุณาระบุชื่อรายการซื้อของ');
  }
  const category = PURCHASE_CATEGORIES.includes(input.category)
    ? input.category
    : 'อื่นๆ';
  const paymentMethod: PaymentMethod =
    input.paymentMethod === 'krungthai' ? 'krungthai' : 'cash';
  const amount = sanitizeNumber(input.amount, MAX_AMOUNT_VALUE);
  if (amount <= 0) {
    throw new Error('กรุณาระบุจำนวนเงินที่จ่ายมากกว่า 0 บาท');
  }
  const note = input.note.trim().slice(0, MAX_NOTE_LENGTH);

  const path = `purchases/${purchaseId}`;
  try {
    await updateDoc(doc(db, 'purchases', purchaseId), {
      date,
      itemName,
      category,
      paymentMethod,
      amount,
      note,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  const path = `purchases/${purchaseId}`;
  try {
    await deleteDoc(doc(db, 'purchases', purchaseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveShopSettings(
  uid: string,
  input: ShopSettingsInput
): Promise<void> {
  const shopName =
    input.shopName.trim().slice(0, MAX_SHOP_NAME_LENGTH) ||
    'ร้านหมาล่าทอด หลังเกษราษฎร์';
  const initialCashBalance = sanitizeNumber(
    input.initialCashBalance,
    100_000_000
  );
  const initialKrungthaiBalance = sanitizeNumber(
    input.initialKrungthaiBalance,
    100_000_000
  );

  const path = `shopSettings/${uid}`;
  try {
    await setDoc(doc(db, 'shopSettings', uid), {
      ownerId: uid,
      shopName,
      initialCashBalance,
      initialKrungthaiBalance,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
