import { useEffect, useState, type FormEvent } from 'react';
import {
  Banknote,
  CheckCircle2,
  Landmark,
  Plus,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import { formatBaht, getTodayISO } from '../lib/format';
import {
  createPurchase,
  createSale,
  updatePurchase,
  updateSale,
} from '../lib/ledgerService';
import {
  MAX_ITEM_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  PURCHASE_CATEGORIES,
  type PaymentMethod,
  type PurchaseCategory,
  type PurchaseRecord,
  type SaleRecord,
} from '../types/ledger';

export type EditingTarget =
  | { kind: 'sale'; record: SaleRecord }
  | { kind: 'purchase'; record: PurchaseRecord }
  | null;

interface EntryWorkbenchProps {
  uid: string;
  editingTarget: EditingTarget;
  onCancelEdit: () => void;
}

const SALE_QUICK_NOTES = [
  'ยอดขายหน้าร้าน',
  'สรุปยอดขายประจำวัน',
  'ออเดอร์เดลิเวอรี',
  'ขายรอบค่ำ',
];

const PURCHASE_QUICK_ITEMS: { label: string; category: PurchaseCategory }[] = [
  { label: 'หมูสามชั้น / เนื้อสัตว์', category: 'วัตถุดิบ' },
  { label: 'ลูกชิ้น / ไส้กรอก / เต้าหู้', category: 'วัตถุดิบ' },
  { label: 'ผักสด / เห็ดเข็มทอง', category: 'วัตถุดิบ' },
  { label: 'ผงหมาล่า / เครื่องเทศ', category: 'เครื่องปรุง' },
  { label: 'น้ำมันทอด', category: 'เครื่องปรุง' },
  { label: 'ไม้เสียบ / ถุง / กล่อง', category: 'บรรจุภัณฑ์' },
  { label: 'แก๊สหุงต้ม', category: 'ค่าใช้จ่ายร้าน' },
  { label: 'ค่าเช่าที่ / น้ำไฟ', category: 'ค่าใช้จ่ายร้าน' },
];

export function EntryWorkbench({
  uid,
  editingTarget,
  onCancelEdit,
}: EntryWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'sale' | 'purchase'>('sale');

  // Sale form state
  const [saleDate, setSaleDate] = useState<string>(getTodayISO());
  const [saleNote, setSaleNote] = useState<string>('ยอดขายหน้าร้าน');
  const [cashInput, setCashInput] = useState<string>('');
  const [krungthaiInput, setKrungthaiInput] = useState<string>('');

  // Purchase form state
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayISO());
  const [itemName, setItemName] = useState<string>('');
  const [category, setCategory] = useState<PurchaseCategory>('วัตถุดิบ');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [purchaseNote, setPurchaseNote] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingTarget) return;
    setFormError(null);
    setSuccessMessage(null);

    if (editingTarget.kind === 'sale') {
      setActiveTab('sale');
      setSaleDate(editingTarget.record.date);
      setSaleNote(editingTarget.record.note);
      setCashInput(
        editingTarget.record.cashAmount > 0
          ? String(editingTarget.record.cashAmount)
          : ''
      );
      setKrungthaiInput(
        editingTarget.record.krungthaiAmount > 0
          ? String(editingTarget.record.krungthaiAmount)
          : ''
      );
    } else {
      setActiveTab('purchase');
      setPurchaseDate(editingTarget.record.date);
      setItemName(editingTarget.record.itemName);
      setCategory(editingTarget.record.category);
      setPaymentMethod(editingTarget.record.paymentMethod);
      setPurchaseAmount(String(editingTarget.record.amount));
      setPurchaseNote(editingTarget.record.note);
    }
  }, [editingTarget]);

  const parsedCash = Math.max(0, Number(cashInput) || 0);
  const parsedKrungthai = Math.max(0, Number(krungthaiInput) || 0);
  const saleTotal = Math.round((parsedCash + parsedKrungthai) * 100) / 100;
  const cashPct = saleTotal > 0 ? Math.round((parsedCash / saleTotal) * 100) : 0;
  const krungthaiPct = saleTotal > 0 ? 100 - cashPct : 0;

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    window.setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const resetSaleForm = () => {
    setCashInput('');
    setKrungthaiInput('');
    setSaleNote('ยอดขายหน้าร้าน');
  };

  const resetPurchaseForm = () => {
    setItemName('');
    setPurchaseAmount('');
    setPurchaseNote('');
  };

  const handleTabChange = (tab: 'sale' | 'purchase') => {
    if (editingTarget) {
      onCancelEdit();
    }
    setActiveTab(tab);
    setFormError(null);
  };

  const handleSaleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (saleTotal <= 0) {
      setFormError('กรุณากรอกยอดเงินสด หรือยอดโอนเข้าบัญชีกรุงไทยอย่างน้อย 1 ช่อง');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: saleDate,
        note: saleNote.trim() || 'ยอดขายหน้าร้าน',
        cashAmount: parsedCash,
        krungthaiAmount: parsedKrungthai,
      };

      if (editingTarget && editingTarget.kind === 'sale') {
        await updateSale(editingTarget.record.id, payload);
        onCancelEdit();
        resetSaleForm();
        showToast('อัปเดตรายการขายเรียบร้อยแล้ว');
      } else {
        await createSale(uid, payload);
        resetSaleForm();
        showToast('บันทึกรายการขายเรียบร้อยแล้ว');
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการขายได้'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountVal = Number(purchaseAmount) || 0;
    if (!itemName.trim()) {
      setFormError('กรุณาระบุชื่อรายการซื้อของ');
      return;
    }
    if (amountVal <= 0) {
      setFormError('กรุณาระบุจำนวนเงินที่จ่ายมากกว่า 0 บาท');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: purchaseDate,
        itemName: itemName.trim(),
        category,
        paymentMethod,
        amount: amountVal,
        note: purchaseNote.trim(),
      };

      if (editingTarget && editingTarget.kind === 'purchase') {
        await updatePurchase(editingTarget.record.id, payload);
        onCancelEdit();
        resetPurchaseForm();
        showToast('อัปเดตรายการซื้อของเรียบร้อยแล้ว');
      } else {
        await createPurchase(uid, payload);
        resetPurchaseForm();
        showToast('บันทึกรายการซื้อของเรียบร้อยแล้ว');
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการซื้อของได้'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditingSale = editingTarget?.kind === 'sale';
  const isEditingPurchase = editingTarget?.kind === 'purchase';

  return (
    <section
      id="entry"
      aria-label="แบบฟอร์มบันทึกรายการ"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            {editingTarget ? 'แก้ไขรายการที่เลือก' : 'บันทึกข้อมูลประจำวัน'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'sale'
              ? 'กรอกยอดขายโดยแยกจำนวนเงินสดและยอดโอนเข้าบัญชีกรุงไทย'
              : 'กรอกรายการซื้อวัตถุดิบหรือค่าใช้จ่ายพร้อมเลือกวิธีจ่ายเงิน'}
          </p>
        </div>

        {editingTarget && (
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              resetSaleForm();
              resetPurchaseForm();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>ยกเลิกการแก้ไข</span>
          </button>
        )}
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="เลือกรูปแบบการบันทึก"
        className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sale'}
          onClick={() => handleTabChange('sale')}
          className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'sale'
              ? 'bg-white text-red-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>คีย์ยอดขาย</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'purchase'}
          onClick={() => handleTabChange('purchase')}
          className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'purchase'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>คีย์รายการซื้อของ</span>
        </button>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      {activeTab === 'sale' ? (
        <form onSubmit={handleSaleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="sale-date"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              วันที่ขาย
            </label>
            <input
              id="sale-date"
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 font-mono-nums"
            />
          </div>

          <div>
            <label
              htmlFor="sale-note"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              รายละเอียด / หมายเหตุ
            </label>
            <input
              id="sale-note"
              type="text"
              maxLength={MAX_NOTE_LENGTH}
              value={saleNote}
              onChange={(e) => setSaleNote(e.target.value)}
              placeholder="เช่น ยอดขายหน้าร้าน, รอบค่ำ, ออเดอร์โต๊ะ 2"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SALE_QUICK_NOTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSaleNote(preset)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    saleNote === preset
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label
                htmlFor="sale-cash"
                className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>เงินสด (บาท)</span>
                </span>
                {cashInput && (
                  <button
                    type="button"
                    onClick={() => setCashInput('')}
                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ล้าง
                  </button>
                )}
              </label>
              <input
                id="sale-cash"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-base font-semibold font-mono-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="sale-krungthai"
                className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-sky-700" />
                  <span>โอนเข้ากรุงไทย (บาท)</span>
                </span>
                {krungthaiInput && (
                  <button
                    type="button"
                    onClick={() => setKrungthaiInput('')}
                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ล้าง
                  </button>
                )}
              </label>
              <input
                id="sale-krungthai"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={krungthaiInput}
                onChange={(e) => setKrungthaiInput(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-base font-semibold font-mono-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
              />
            </div>
          </div>

          {/* Live Sale Total Readout */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">
                รวมยอดขายรายการนี้
              </span>
              <span className="text-xl font-bold font-mono-nums text-slate-900">
                ฿{formatBaht(saleTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono-nums">
              <span>
                เงินสด ฿{formatBaht(parsedCash)} ({cashPct}%)
              </span>
              <span>
                กรุงไทย ฿{formatBaht(parsedKrungthai)} ({krungthaiPct}%)
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'กำลังบันทึก...'
                : isEditingSale
                  ? 'บันทึกการแก้ไขยอดขาย'
                  : 'บันทึกรายการขาย'}
            </span>
          </button>
        </form>
      ) : (
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="purchase-date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                วันที่ซื้อ / จ่ายเงิน
              </label>
              <input
                id="purchase-date"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono-nums"
              />
            </div>

            <div>
              <label
                htmlFor="purchase-category"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                หมวดหมู่
              </label>
              <select
                id="purchase-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PurchaseCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              >
                {PURCHASE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="purchase-item"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              ชื่อรายการซื้อของ
            </label>
            <input
              id="purchase-item"
              type="text"
              required
              maxLength={MAX_ITEM_NAME_LENGTH}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="เช่น หมูสามชั้น 3 กก., น้ำมันพืช, ผงหมาล่า"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PURCHASE_QUICK_ITEMS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setItemName(preset.label);
                    setCategory(preset.category);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    itemName === preset.label
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="purchase-amount"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              จำนวนเงินที่จ่าย (บาท)
            </label>
            <input
              id="purchase-amount"
              type="number"
              inputMode="decimal"
              required
              min="0.01"
              step="0.01"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 text-base font-semibold font-mono-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              วิธีจ่ายเงิน
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                aria-pressed={paymentMethod === 'cash'}
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-2 px-3.5 py-3 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote
                  className={`w-4 h-4 ${
                    paymentMethod === 'cash' ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                />
                <span>จ่ายเงินสด</span>
              </button>

              <button
                type="button"
                aria-pressed={paymentMethod === 'krungthai'}
                onClick={() => setPaymentMethod('krungthai')}
                className={`flex items-center justify-center gap-2 px-3.5 py-3 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paymentMethod === 'krungthai'
                    ? 'bg-sky-50 border-sky-600 text-sky-900 ring-1 ring-sky-600'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Landmark
                  className={`w-4 h-4 ${
                    paymentMethod === 'krungthai' ? 'text-sky-700' : 'text-slate-500'
                  }`}
                />
                <span>ธนาคารกรุงไทย</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="purchase-note"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              id="purchase-note"
              type="text"
              maxLength={MAX_NOTE_LENGTH}
              value={purchaseNote}
              onChange={(e) => setPurchaseNote(e.target.value)}
              placeholder="เช่น ซื้อจากตลาดสด, แม็คโคร"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'กำลังบันทึก...'
                : isEditingPurchase
                  ? 'บันทึกการแก้ไขรายการซื้อ'
                  : 'บันทึกรายการซื้อของ'}
            </span>
          </button>
        </form>
      )}
    </section>
  );
}
