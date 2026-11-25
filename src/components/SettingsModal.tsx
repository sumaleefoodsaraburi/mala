import { useEffect, useState, type FormEvent } from 'react';
import { Banknote, Landmark, Save, X } from 'lucide-react';
import { saveShopSettings } from '../lib/ledgerService';
import { MAX_SHOP_NAME_LENGTH, type ShopSettings } from '../types/ledger';

interface SettingsModalProps {
  isOpen: boolean;
  uid: string;
  settings: ShopSettings | null;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  uid,
  settings,
  onClose,
}: SettingsModalProps) {
  const [shopName, setShopName] = useState('ร้านหมาล่าทอด หลังเกษราษฎร์');
  const [initialCash, setInitialCash] = useState('0');
  const [initialKrungthai, setInitialKrungthai] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShopName(settings?.shopName || 'ร้านหมาล่าทอด หลังเกษราษฎร์');
    setInitialCash(String(settings?.initialCashBalance ?? 0));
    setInitialKrungthai(String(settings?.initialKrungthaiBalance ?? 0));
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await saveShopSettings(uid, {
        shopName: shopName.trim() || 'ร้านหมาล่าทอด หลังเกษราษฎร์',
        initialCashBalance: Math.max(0, Number(initialCash) || 0),
        initialKrungthaiBalance: Math.max(0, Number(initialKrungthai) || 0),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="settings-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              ตั้งค่ายอดเงินยกมาและข้อมูลร้าน
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ใช้สำหรับคำนวณยอดเงินสดในเก๊ะและยอดบัญชีกรุงไทยสะสม
            </p>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="settings-shop-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              ชื่อร้าน
            </label>
            <input
              id="settings-shop-name"
              type="text"
              required
              maxLength={MAX_SHOP_NAME_LENGTH}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="settings-initial-cash"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5"
            >
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>ยอดเงินสดยกมา / เงินทอนตั้งต้น (บาท)</span>
            </label>
            <input
              id="settings-initial-cash"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="settings-initial-kt"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5"
            >
              <Landmark className="w-4 h-4 text-sky-700" />
              <span>ยอดเงินยกมาในบัญชีกรุงไทย (บาท)</span>
            </label>
            <input
              id="settings-initial-kt"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={initialKrungthai}
              onChange={(e) => setInitialKrungthai(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
