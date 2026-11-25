/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { EntryWorkbench, type EditingTarget } from './components/EntryWorkbench';
import { LedgerTable } from './components/LedgerTable';
import { ProfitLossOverview } from './components/ProfitLossOverview';
import { SettingsModal } from './components/SettingsModal';
import { TopBar } from './components/TopBar';
import {
  extractErrorMessage,
  getDaysAgoISO,
  getMonthStartISO,
  getTodayISO,
} from './lib/format';
import {
  subscribeToPurchases,
  subscribeToSales,
  subscribeToShopSettings,
} from './lib/ledgerService';
import type {
  DateRangePreset,
  PurchaseRecord,
  SaleRecord,
  ShopSettings,
} from './types/ledger';

export default function App() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [customStart, setCustomStart] = useState<string>(getMonthStartISO());
  const [customEnd, setCustomEnd] = useState<string>(getTodayISO());

  const [editingTarget, setEditingTarget] = useState<EditingTarget>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setDataLoading(true);
    setDbError(null);
    let salesLoaded = false;
    let purchasesLoaded = false;

    const markLoadedIfReady = () => {
      if (salesLoaded && purchasesLoaded) {
        setDataLoading(false);
      }
    };

    const handleSubError = (err: Error) => {
      setDataLoading(false);
      setDbError(
        extractErrorMessage(
          err,
          'ไม่สามารถเชื่อมต่อฐานข้อมูล Firebase ได้ในขณะนี้'
        )
      );
    };

    const unsubSales = subscribeToSales((rows) => {
      setSales(rows);
      salesLoaded = true;
      setDbError(null);
      markLoadedIfReady();
    }, handleSubError);

    const unsubPurchases = subscribeToPurchases((rows) => {
      setPurchases(rows);
      purchasesLoaded = true;
      setDbError(null);
      markLoadedIfReady();
    }, handleSubError);

    const unsubSettings = subscribeToShopSettings((cfg) => {
      setSettings(cfg);
    }, handleSubError);

    return () => {
      unsubSales();
      unsubPurchases();
      unsubSettings();
    };
  }, []);

  const dateBounds = useMemo<{ start: string | null; end: string | null }>(() => {
    const today = getTodayISO();
    switch (preset) {
      case 'today':
        return { start: today, end: today };
      case '7days':
        return { start: getDaysAgoISO(6), end: today };
      case 'month':
        return { start: getMonthStartISO(), end: today };
      case 'custom':
        return {
          start: customStart || null,
          end: customEnd || null,
        };
      case 'all':
      default:
        return { start: null, end: null };
    }
  }, [preset, customStart, customEnd]);

  const handleSavedDate = (savedDate: string) => {
    const outOfRange =
      (dateBounds.start && savedDate < dateBounds.start) ||
      (dateBounds.end && savedDate > dateBounds.end);
    if (outOfRange) {
      setPreset('all');
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (dateBounds.start && s.date < dateBounds.start) return false;
      if (dateBounds.end && s.date > dateBounds.end) return false;
      return true;
    });
  }, [sales, dateBounds]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (dateBounds.start && p.date < dateBounds.start) return false;
      if (dateBounds.end && p.date > dateBounds.end) return false;
      return true;
    });
  }, [purchases, dateBounds]);

  const displayShopName =
    settings?.shopName || 'ร้านหมาล่าทอด หลังเกษราษฎร์';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        shopName={displayShopName}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {dbError && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <span>{dbError}</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>โหลดข้อมูลใหม่</span>
            </button>
          </div>
        )}

        <ProfitLossOverview
          sales={filteredSales}
          purchases={filteredPurchases}
          allSales={sales}
          allPurchases={purchases}
          settings={settings}
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPreset}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onOpenSettings={() => setSettingsOpen(true)}
          isLoading={dataLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
            <EntryWorkbench
              editingTarget={editingTarget}
              onCancelEdit={() => setEditingTarget(null)}
              onSavedDate={handleSavedDate}
            />
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            <LedgerTable
              sales={filteredSales}
              purchases={filteredPurchases}
              isLoading={dataLoading}
              onEdit={setEditingTarget}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>{displayShopName}</span>
          <span>ระบบบันทึกรายการขาย รายการซื้อของ และสรุปกำไรขาดทุน</span>
        </div>
      </footer>

      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
