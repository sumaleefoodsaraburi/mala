/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { EntryWorkbench, type EditingTarget } from './components/EntryWorkbench';
import { LedgerTable } from './components/LedgerTable';
import { ProfitLossOverview } from './components/ProfitLossOverview';
import { SettingsModal } from './components/SettingsModal';
import { SignInView } from './components/SignInView';
import { TopBar } from './components/TopBar';
import { auth, googleProvider } from './lib/firebase';
import {
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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [customStart, setCustomStart] = useState<string>(getMonthStartISO());
  const [customEnd, setCustomEnd] = useState<string>(getTodayISO());

  const [editingTarget, setEditingTarget] = useState<EditingTarget>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setSales([]);
        setPurchases([]);
        setSettings(null);
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    let salesLoaded = false;
    let purchasesLoaded = false;

    const markLoadedIfReady = () => {
      if (salesLoaded && purchasesLoaded) {
        setDataLoading(false);
      }
    };

    const unsubSales = subscribeToSales(user.uid, (rows) => {
      setSales(rows);
      salesLoaded = true;
      markLoadedIfReady();
    });

    const unsubPurchases = subscribeToPurchases(user.uid, (rows) => {
      setPurchases(rows);
      purchasesLoaded = true;
      markLoadedIfReady();
    });

    const unsubSettings = subscribeToShopSettings(user.uid, (cfg) => {
      setSettings(cfg);
    });

    return () => {
      unsubSales();
      unsubPurchases();
      unsubSettings();
    };
  }, [authReady, user]);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code !== 'auth/popup-closed-by-user') {
        setAuthError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setEditingTarget(null);
    setSettingsOpen(false);
    await signOut(auth);
  };

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
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!authReady ? (
        <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-slate-200 rounded-xl p-8 h-64 animate-pulse" />
        </main>
      ) : !user ? (
        <div className="flex-1">
          <SignInView
            onSignIn={handleSignIn}
            isSigningIn={isSigningIn}
            authError={authError}
          />
        </div>
      ) : (
        <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
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
                uid={user.uid}
                editingTarget={editingTarget}
                onCancelEdit={() => setEditingTarget(null)}
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
      )}

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>{displayShopName}</span>
          <span>ระบบบันทึกรายการขาย รายการซื้อของ และสรุปกำไรขาดทุน</span>
        </div>
      </footer>

      {user && (
        <SettingsModal
          isOpen={settingsOpen}
          uid={user.uid}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
