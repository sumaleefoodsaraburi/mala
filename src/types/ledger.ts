import type { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'cash' | 'krungthai';

export type PurchaseCategory =
  | 'วัตถุดิบ'
  | 'เครื่องปรุง'
  | 'บรรจุภัณฑ์'
  | 'ค่าใช้จ่ายร้าน'
  | 'อื่นๆ';

export const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  'วัตถุดิบ',
  'เครื่องปรุง',
  'บรรจุภัณฑ์',
  'ค่าใช้จ่ายร้าน',
  'อื่นๆ',
];

export const MAX_NOTE_LENGTH = 200;
export const MAX_ITEM_NAME_LENGTH = 120;
export const MAX_SHOP_NAME_LENGTH = 100;
export const MAX_AMOUNT_VALUE = 10_000_000;

export interface SaleRecord {
  id: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  note: string;
  cashAmount: number;
  krungthaiAmount: number;
  totalAmount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PurchaseRecord {
  id: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  itemName: string;
  category: PurchaseCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  note: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ShopSettings {
  ownerId: string;
  shopName: string;
  initialCashBalance: number;
  initialKrungthaiBalance: number;
  updatedAt: Timestamp | null;
}

export type DateRangePreset = 'today' | '7days' | 'month' | 'all' | 'custom';

export type UnifiedLedgerEntry =
  | {
      kind: 'sale';
      id: string;
      date: string;
      title: string;
      subtitle: string;
      cashDelta: number;
      krungthaiDelta: number;
      totalAmount: number;
      createdAtMs: number;
      raw: SaleRecord;
    }
  | {
      kind: 'purchase';
      id: string;
      date: string;
      title: string;
      subtitle: string;
      category: PurchaseCategory;
      paymentMethod: PaymentMethod;
      cashDelta: number;
      krungthaiDelta: number;
      totalAmount: number;
      createdAtMs: number;
      raw: PurchaseRecord;
    };
