import type { UnifiedLedgerEntry } from '../types/ledger';

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysAgoISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthStartISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function formatBaht(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatSignedBaht(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = formatBaht(Math.abs(safe));
  if (safe > 0) return `+฿${formatted}`;
  if (safe < 0) return `-฿${formatted}`;
  return `฿${formatted}`;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatThaiDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const monthLabel = THAI_MONTHS_SHORT[m - 1] ?? String(m);
  const buddhistYear = y + 543;
  return `${d} ${monthLabel} ${buddhistYear}`;
}

export function formatThaiShortDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [, m, d] = isoDate.split('-').map(Number);
  const monthLabel = THAI_MONTHS_SHORT[m - 1] ?? String(m);
  return `${d} ${monthLabel}`;
}

export function exportLedgerCSV(entries: UnifiedLedgerEntry[], filenamePrefix: string): void {
  const headers = [
    'วันที่',
    'ประเภท',
    'รายการ / หมายเหตุ',
    'หมวดหมู่',
    'ช่องทางหลัก',
    'เงินสด (รับ/จ่าย)',
    'ธนาคารกรุงไทย (รับ/จ่าย)',
    'รวมสุทธิรายการ (บาท)',
  ];

  const escapeCell = (value: string | number): string => {
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = entries.map((entry) => {
    if (entry.kind === 'sale') {
      const channel =
        entry.cashDelta > 0 && entry.krungthaiDelta > 0
          ? 'เงินสด + กรุงไทย'
          : entry.cashDelta > 0
            ? 'เงินสด'
            : 'ธนาคารกรุงไทย';
      return [
        entry.date,
        'ยอดขาย',
        entry.title,
        'รายรับจากการขาย',
        channel,
        entry.cashDelta,
        entry.krungthaiDelta,
        entry.totalAmount,
      ].map(escapeCell);
    }

    return [
      entry.date,
      'รายการซื้อของ',
      entry.subtitle ? `${entry.title} (${entry.subtitle})` : entry.title,
      entry.category,
      entry.paymentMethod === 'cash' ? 'เงินสด' : 'ธนาคารกรุงไทย',
      entry.cashDelta,
      entry.krungthaiDelta,
      -entry.totalAmount,
    ].map(escapeCell);
  });

  const csvContent =
    '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}_${getTodayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
