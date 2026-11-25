import { useMemo, useState } from 'react';
import {
  Banknote,
  Download,
  Landmark,
  Pencil,
  Search,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react';
import {
  exportLedgerCSV,
  formatBaht,
  formatSignedBaht,
  formatThaiDate,
} from '../lib/format';
import { deletePurchase, deleteSale } from '../lib/ledgerService';
import type {
  PurchaseRecord,
  SaleRecord,
  UnifiedLedgerEntry,
} from '../types/ledger';
import type { EditingTarget } from './EntryWorkbench';

interface LedgerTableProps {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  isLoading: boolean;
  onEdit: (target: EditingTarget) => void;
}

type TypeFilter = 'all' | 'sale' | 'purchase';
type ChannelFilter = 'all' | 'cash' | 'krungthai';

export function LedgerTable({
  sales,
  purchases,
  isLoading,
  onEdit,
}: LedgerTableProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const unifiedEntries = useMemo<UnifiedLedgerEntry[]>(() => {
    const saleEntries: UnifiedLedgerEntry[] = sales.map((s) => ({
      kind: 'sale',
      id: s.id,
      date: s.date,
      title: s.note || 'ยอดขายหน้าร้าน',
      subtitle:
        s.cashAmount > 0 && s.krungthaiAmount > 0
          ? 'รับเงินสด + โอนกรุงไทย'
          : s.cashAmount > 0
            ? 'รับเงินสด'
            : 'โอนเข้าบัญชีกรุงไทย',
      cashDelta: s.cashAmount,
      krungthaiDelta: s.krungthaiAmount,
      totalAmount: s.totalAmount,
      createdAtMs: s.createdAt ? s.createdAt.toMillis() : 0,
      raw: s,
    }));

    const purchaseEntries: UnifiedLedgerEntry[] = purchases.map((p) => ({
      kind: 'purchase',
      id: p.id,
      date: p.date,
      title: p.itemName,
      subtitle: p.note,
      category: p.category,
      paymentMethod: p.paymentMethod,
      cashDelta: p.paymentMethod === 'cash' ? -p.amount : 0,
      krungthaiDelta: p.paymentMethod === 'krungthai' ? -p.amount : 0,
      totalAmount: p.amount,
      createdAtMs: p.createdAt ? p.createdAt.toMillis() : 0,
      raw: p,
    }));

    return [...saleEntries, ...purchaseEntries].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAtMs - a.createdAtMs;
    });
  }, [sales, purchases]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedEntries.filter((entry) => {
      if (typeFilter !== 'all' && entry.kind !== typeFilter) return false;

      if (channelFilter === 'cash' && entry.cashDelta === 0) return false;
      if (channelFilter === 'krungthai' && entry.krungthaiDelta === 0) return false;

      if (q) {
        const haystack =
          entry.kind === 'sale'
            ? `${entry.title} ${entry.subtitle} ${entry.date}`.toLowerCase()
            : `${entry.title} ${entry.subtitle} ${entry.category} ${entry.date}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [unifiedEntries, typeFilter, channelFilter, searchQuery]);

  const handleConfirmDelete = async (entry: UnifiedLedgerEntry) => {
    const key = `${entry.kind}-${entry.id}`;
    setDeletingKey(key);
    setActionError(null);
    try {
      if (entry.kind === 'sale') {
        await deleteSale(entry.id);
      } else {
        await deletePurchase(entry.id);
      }
      setConfirmDeleteKey(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'ไม่สามารถลบรายการได้'
      );
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <section
      id="ledger"
      aria-label="ตารางรายการขายและรายการซื้อของ"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
    >
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            ประวัติรายการขายและซื้อของ ({filteredEntries.length} รายการ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แสดงยอดรับเงินสด ยอดโอนเข้ากรุงไทย และรายจ่ายแยกตามวิธีชำระเงิน
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportLedgerCSV(filteredEntries, 'mala_kasemrad_ledger')}
          disabled={filteredEntries.length === 0}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>ส่งออก CSV</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'sale', label: 'ยอดขาย' },
                { id: 'purchase', label: 'รายการซื้อของ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Channel filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'ทุกช่องทาง' },
                { id: 'cash', label: 'เงินสด' },
                { id: 'krungthai', label: 'กรุงไทย' },
              ] as const
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(ch.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  channelFilter === ch.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารายการ หรือหมายเหตุ..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
        >
          {actionError}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="h-11 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
          <p className="text-sm font-medium text-slate-700">
            ยังไม่มีรายการที่ตรงกับเงื่อนไขในช่วงเวลานี้
          </p>
          <p className="text-xs text-slate-500">
            ลองเปลี่ยนตัวกรองช่วงเวลา หรือคีย์ยอดขายและรายการซื้อของใหม่จากแบบฟอร์มด้านข้าง
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 pr-3 text-left font-medium">วันที่</th>
                <th className="py-2.5 px-3 text-left font-medium">
                  ประเภท / รายละเอียด
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>เงินสด</span>
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Landmark className="w-3.5 h-3.5 text-sky-700" />
                    <span>กรุงไทย</span>
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">สุทธิรายการ</th>
                <th className="py-2.5 pl-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const rowKey = `${entry.kind}-${entry.id}`;
                const isConfirming = confirmDeleteKey === rowKey;
                const isDeleting = deletingKey === rowKey;

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 pr-3 font-mono-nums text-xs text-slate-600 whitespace-nowrap">
                      {formatThaiDate(entry.date)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-start gap-2.5">
                        {entry.kind === 'sale' ? (
                          <Store className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate max-w-[260px]">
                            {entry.title}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>
                              {entry.kind === 'sale' ? 'ยอดขาย' : 'ซื้อของ'}
                            </span>
                            <span aria-hidden="true">·</span>
                            {entry.kind === 'purchase' ? (
                              <>
                                <span>{entry.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {entry.paymentMethod === 'cash'
                                    ? 'จ่ายเงินสด'
                                    : 'จ่ายกรุงไทย'}
                                </span>
                                {entry.subtitle && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate max-w-[160px]">
                                      {entry.subtitle}
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span>{entry.subtitle}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono-nums whitespace-nowrap ${
                        entry.cashDelta > 0
                          ? 'text-emerald-700'
                          : entry.cashDelta < 0
                            ? 'text-red-700'
                            : 'text-slate-300'
                      }`}
                    >
                      {entry.cashDelta !== 0
                        ? formatSignedBaht(entry.cashDelta)
                        : '—'}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono-nums whitespace-nowrap ${
                        entry.krungthaiDelta > 0
                          ? 'text-emerald-700'
                          : entry.krungthaiDelta < 0
                            ? 'text-red-700'
                            : 'text-slate-300'
                      }`}
                    >
                      {entry.krungthaiDelta !== 0
                        ? formatSignedBaht(entry.krungthaiDelta)
                        : '—'}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono-nums font-semibold whitespace-nowrap ${
                        entry.kind === 'sale'
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {entry.kind === 'sale'
                        ? `+฿${formatBaht(entry.totalAmount)}`
                        : `-฿${formatBaht(entry.totalAmount)}`}
                    </td>

                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => void handleConfirmDelete(entry)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors cursor-pointer"
                          >
                            {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteKey(null)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="แก้ไขรายการ"
                            onClick={() => {
                              onEdit(
                                entry.kind === 'sale'
                                  ? { kind: 'sale', record: entry.raw }
                                  : { kind: 'purchase', record: entry.raw }
                              );
                              document
                                .getElementById('entry')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="ลบรายการ"
                            onClick={() => setConfirmDeleteKey(rowKey)}
                            className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
