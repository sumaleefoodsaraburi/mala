import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  Landmark,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  formatBaht,
  formatSignedBaht,
  formatThaiDate,
  formatThaiShortDate,
} from '../lib/format';
import type {
  DateRangePreset,
  PurchaseRecord,
  SaleRecord,
  ShopSettings,
} from '../types/ledger';

interface ProfitLossOverviewProps {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  allSales: SaleRecord[];
  allPurchases: PurchaseRecord[];
  settings: ShopSettings | null;
  preset: DateRangePreset;
  customStart: string;
  customEnd: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomStartChange: (val: string) => void;
  onCustomEndChange: (val: string) => void;
  onOpenSettings: () => void;
  isLoading: boolean;
}

const PRESET_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'วันนี้' },
  { id: '7days', label: '7 วันล่าสุด' },
  { id: 'month', label: 'เดือนนี้' },
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'custom', label: 'เลือกช่วงวันที่' },
];

export function ProfitLossOverview({
  sales,
  purchases,
  allSales,
  allPurchases,
  settings,
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
  onOpenSettings,
  isLoading,
}: ProfitLossOverviewProps) {
  const periodStats = useMemo(() => {
    const salesCash = sales.reduce((sum, s) => sum + s.cashAmount, 0);
    const salesKrungthai = sales.reduce((sum, s) => sum + s.krungthaiAmount, 0);
    const totalSales = salesCash + salesKrungthai;

    const purchasesCash = purchases
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    const purchasesKrungthai = purchases
      .filter((p) => p.paymentMethod === 'krungthai')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPurchases = purchasesCash + purchasesKrungthai;

    const netProfit = totalSales - totalPurchases;
    const profitMargin =
      totalSales > 0 ? Math.round((netProfit / totalSales) * 1000) / 10 : 0;

    return {
      salesCash,
      salesKrungthai,
      totalSales,
      purchasesCash,
      purchasesKrungthai,
      totalPurchases,
      netProfit,
      profitMargin,
      cashNet: salesCash - purchasesCash,
      krungthaiNet: salesKrungthai - purchasesKrungthai,
    };
  }, [sales, purchases]);

  // All-time cumulative balances per channel (including opening balances)
  const cumulativeBalances = useMemo(() => {
    const openingCash = settings?.initialCashBalance ?? 0;
    const openingKrungthai = settings?.initialKrungthaiBalance ?? 0;

    const allSalesCash = allSales.reduce((s, r) => s + r.cashAmount, 0);
    const allSalesKt = allSales.reduce((s, r) => s + r.krungthaiAmount, 0);

    const allBuyCash = allPurchases
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((s, r) => s + r.amount, 0);
    const allBuyKt = allPurchases
      .filter((p) => p.paymentMethod === 'krungthai')
      .reduce((s, r) => s + r.amount, 0);

    return {
      cashBalance: openingCash + allSalesCash - allBuyCash,
      krungthaiBalance: openingKrungthai + allSalesKt - allBuyKt,
      hasOpening: openingCash > 0 || openingKrungthai > 0,
    };
  }, [allSales, allPurchases, settings]);

  // Daily breakdown for visual P&L comparison (up to 14 most recent active days in period)
  const dailySeries = useMemo(() => {
    const map = new Map<
      string,
      { date: string; sales: number; purchases: number; profit: number }
    >();

    for (const s of sales) {
      const curr = map.get(s.date) ?? {
        date: s.date,
        sales: 0,
        purchases: 0,
        profit: 0,
      };
      curr.sales += s.totalAmount;
      curr.profit = curr.sales - curr.purchases;
      map.set(s.date, curr);
    }

    for (const p of purchases) {
      const curr = map.get(p.date) ?? {
        date: p.date,
        sales: 0,
        purchases: 0,
        profit: 0,
      };
      curr.purchases += p.amount;
      curr.profit = curr.sales - curr.purchases;
      map.set(p.date, curr);
    }

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [sales, purchases]);

  const maxDailyValue = useMemo(() => {
    let maxVal = 0;
    for (const d of dailySeries) {
      maxVal = Math.max(maxVal, d.sales, d.purchases);
    }
    return maxVal > 0 ? maxVal : 1;
  }, [dailySeries]);

  const profitLabel =
    periodStats.netProfit > 0
      ? 'กำไรสุทธิ'
      : periodStats.netProfit < 0
        ? 'ขาดทุนสุทธิ'
        : 'เท่าทุน';

  return (
    <section id="overview" aria-label="สรุปกำไรขาดทุนและยอดคงเหลือ" className="space-y-6">
      {/* Period Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
            สรุปยอดขายและกำไรขาดทุน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ร้านหมาล่าทอด หลังเกษราษฎร์ · แยกรายรับรายจ่ายเงินสดและบัญชีกรุงไทย
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPresetChange(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  preset === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                aria-label="ตั้งแต่วันที่"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="text-xs font-mono-nums text-slate-700 focus:outline-none"
              />
              <span className="text-xs text-slate-400">ถึง</span>
              <input
                type="date"
                aria-label="ถึงวันที่"
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="text-xs font-mono-nums text-slate-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl p-5 h-32 animate-pulse"
            >
              <div className="h-3.5 w-24 bg-slate-200 rounded mb-4" />
              <div className="h-7 w-36 bg-slate-200 rounded mb-3" />
              <div className="h-3 w-44 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: Total Sales */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>ยอดขายรวม</span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>รายรับ ({sales.length} รายการ)</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono-nums text-slate-900">
              ฿{formatBaht(periodStats.totalSales)}
            </div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 font-mono-nums pt-2 border-t border-slate-100">
              <span>เงินสด ฿{formatBaht(periodStats.salesCash)}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>กรุงไทย ฿{formatBaht(periodStats.salesKrungthai)}</span>
            </div>
          </div>

          {/* KPI 2: Total Purchases */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>รายการซื้อของ / ต้นทุนรวม</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>รายจ่าย ({purchases.length} รายการ)</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono-nums text-slate-900">
              ฿{formatBaht(periodStats.totalPurchases)}
            </div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 font-mono-nums pt-2 border-t border-slate-100">
              <span>จ่ายเงินสด ฿{formatBaht(periodStats.purchasesCash)}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>กรุงไทย ฿{formatBaht(periodStats.purchasesKrungthai)}</span>
            </div>
          </div>

          {/* KPI 3: Net Profit / Loss */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>กำไร / ขาดทุนสุทธิ</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  periodStats.netProfit > 0
                    ? 'text-emerald-700'
                    : periodStats.netProfit < 0
                      ? 'text-red-700'
                      : 'text-slate-600'
                }`}
              >
                {periodStats.netProfit >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{profitLabel}</span>
              </span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-bold font-mono-nums ${
                periodStats.netProfit > 0
                  ? 'text-emerald-700'
                  : periodStats.netProfit < 0
                    ? 'text-red-700'
                    : 'text-slate-900'
              }`}
            >
              {formatSignedBaht(periodStats.netProfit)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono-nums pt-2 border-t border-slate-100">
              <span>อัตรากำไรต่อยอดขาย</span>
              <span className="font-semibold text-slate-900">
                {periodStats.totalSales > 0 ? `${periodStats.profitMargin}%` : '—'}
              </span>
            </div>
          </div>

          {/* KPI 4: Channel Balances */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>ยอดคงเหลือสะสมแยกช่องทาง</span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>ตั้งค่ายอดยกมา</span>
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                  <span>เงินสด</span>
                </span>
                <span className="text-lg font-bold font-mono-nums text-slate-900">
                  ฿{formatBaht(cumulativeBalances.cashBalance)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <Landmark className="w-3.5 h-3.5 text-sky-700" />
                  <span>ธนาคารกรุงไทย</span>
                </span>
                <span className="text-lg font-bold font-mono-nums text-slate-900">
                  ฿{formatBaht(cumulativeBalances.krungthaiBalance)}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              {cumulativeBalances.hasOpening
                ? 'รวมยอดตั้งต้น + ยอดขายหักรายจ่ายทั้งหมด'
                : 'คำนวณจากยอดขายหักรายการซื้อทั้งหมด'}
            </div>
          </div>
        </div>
      )}

      {/* Channel Matrix + Daily P&L Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Channel Comparison Table */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              สรุปกระแสเงินสดตามช่องทาง (ช่วงเวลาที่เลือก)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เปรียบเทียบยอดรับจากยอดขาย และยอดจ่ายซื้อของระหว่างเงินสดกับกรุงไทย
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left font-medium">ช่องทาง</th>
                  <th className="py-2 text-right font-medium">ยอดขาย (+)</th>
                  <th className="py-2 text-right font-medium">ซื้อของ (-)</th>
                  <th className="py-2 text-right font-medium">ส่วนต่างสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-nums">
                <tr>
                  <td className="py-3 font-sans font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span>เงินสด</span>
                    </span>
                  </td>
                  <td className="py-3 text-right text-emerald-700">
                    ฿{formatBaht(periodStats.salesCash)}
                  </td>
                  <td className="py-3 text-right text-slate-700">
                    ฿{formatBaht(periodStats.purchasesCash)}
                  </td>
                  <td
                    className={`py-3 text-right font-semibold ${
                      periodStats.cashNet >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatSignedBaht(periodStats.cashNet)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-sans font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-sky-700" />
                      <span>ธนาคารกรุงไทย</span>
                    </span>
                  </td>
                  <td className="py-3 text-right text-emerald-700">
                    ฿{formatBaht(periodStats.salesKrungthai)}
                  </td>
                  <td className="py-3 text-right text-slate-700">
                    ฿{formatBaht(periodStats.purchasesKrungthai)}
                  </td>
                  <td
                    className={`py-3 text-right font-semibold ${
                      periodStats.krungthaiNet >= 0
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    {formatSignedBaht(periodStats.krungthaiNet)}
                  </td>
                </tr>
                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-3 pl-2 font-sans text-slate-900 rounded-l-md">
                    รวมทั้ง 2 ช่องทาง
                  </td>
                  <td className="py-3 text-right text-slate-900">
                    ฿{formatBaht(periodStats.totalSales)}
                  </td>
                  <td className="py-3 text-right text-slate-900">
                    ฿{formatBaht(periodStats.totalPurchases)}
                  </td>
                  <td
                    className={`py-3 pr-2 text-right rounded-r-md ${
                      periodStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatSignedBaht(periodStats.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily P&L Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                เปรียบเทียบยอดขายและต้นทุนรายวัน
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                แสดงสูงสุด 14 วันล่าสุดที่มีรายการในช่วงที่เลือก
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>ยอดขาย</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                <span>รายการซื้อของ</span>
              </span>
            </div>
          </div>

          {dailySeries.length === 0 ? (
            <div className="h-44 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
              ยังไม่มีรายการขายหรือซื้อของในช่วงวันที่เลือก
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 flex items-end gap-2 sm:gap-3 pt-4 pb-1 px-1 overflow-x-auto">
                {dailySeries.map((day) => {
                  const salesHeightPct = Math.max(
                    day.sales > 0 ? 6 : 0,
                    Math.round((day.sales / maxDailyValue) * 100)
                  );
                  const purchaseHeightPct = Math.max(
                    day.purchases > 0 ? 6 : 0,
                    Math.round((day.purchases / maxDailyValue) * 100)
                  );
                  return (
                    <div
                      key={day.date}
                      title={`${formatThaiDate(day.date)} | ขาย ฿${formatBaht(day.sales)} | ซื้อ ฿${formatBaht(day.purchases)} | สุทธิ ${formatSignedBaht(day.profit)}`}
                      className="flex-1 min-w-[36px] h-full flex flex-col items-center justify-end gap-1.5 group"
                    >
                      <div className="w-full flex-1 flex items-end justify-center gap-1">
                        <div
                          style={{ height: `${salesHeightPct}%` }}
                          className="w-3 sm:w-4 bg-emerald-600 group-hover:bg-emerald-700 rounded-t-sm transition-colors"
                        />
                        <div
                          style={{ height: `${purchaseHeightPct}%` }}
                          className="w-3 sm:w-4 bg-slate-300 group-hover:bg-slate-400 rounded-t-sm transition-colors"
                        />
                      </div>
                      <span className="text-[11px] font-mono-nums text-slate-500 whitespace-nowrap">
                        {formatThaiShortDate(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  วันล่าสุด ({formatThaiDate(dailySeries[dailySeries.length - 1].date)}):
                  ขาย{' '}
                  <strong className="font-mono-nums text-slate-900">
                    ฿{formatBaht(dailySeries[dailySeries.length - 1].sales)}
                  </strong>{' '}
                  · ซื้อ{' '}
                  <strong className="font-mono-nums text-slate-900">
                    ฿{formatBaht(dailySeries[dailySeries.length - 1].purchases)}
                  </strong>
                </span>
                <span
                  className={`font-mono-nums font-semibold ${
                    dailySeries[dailySeries.length - 1].profit >= 0
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  สุทธิ {formatSignedBaht(dailySeries[dailySeries.length - 1].profit)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
