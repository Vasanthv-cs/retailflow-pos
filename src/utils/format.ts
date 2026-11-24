import type { CartItem } from '@/src/types/pos';

export function formatINR(value: number, showDecimals = true): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safeValue);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function isSameDay(isoA: string, dateB: Date): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

export interface CartCalculation {
  grossSubtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;
  estimatedProfit: number;
}

export function calculateCartTotals(
  items: CartItem[],
  discountType: 'percent' | 'flat',
  discountValue: number,
  taxInclusive = false
): CartCalculation {
  const safeDiscount = Math.max(0, Number.isFinite(discountValue) ? discountValue : 0);

  let rawLinesSum = 0;
  for (const item of items) {
    rawLinesSum += item.sellingPrice * item.quantity;
  }

  let discountAmount =
    discountType === 'percent'
      ? (rawLinesSum * Math.min(100, safeDiscount)) / 100
      : Math.min(rawLinesSum, safeDiscount);

  discountAmount = round2(discountAmount);
  const discountRatio = rawLinesSum > 0 ? discountAmount / rawLinesSum : 0;

  let taxableValue = 0;
  let totalTax = 0;
  let totalCost = 0;

  for (const item of items) {
    const lineGross = item.sellingPrice * item.quantity;
    const lineAfterDiscount = lineGross * (1 - discountRatio);

    if (taxInclusive) {
      const base = lineAfterDiscount / (1 + item.gstRate / 100);
      const tax = lineAfterDiscount - base;
      taxableValue += base;
      totalTax += tax;
    } else {
      const tax = (lineAfterDiscount * item.gstRate) / 100;
      taxableValue += lineAfterDiscount;
      totalTax += tax;
    }

    totalCost += item.purchasePrice * item.quantity;
  }

  taxableValue = round2(taxableValue);
  totalTax = round2(totalTax);
  const cgstAmount = round2(totalTax / 2);
  const sgstAmount = round2(totalTax - cgstAmount);
  const grandTotal = round2(taxableValue + totalTax);
  const estimatedProfit = round2(taxableValue - totalCost);

  return {
    grossSubtotal: round2(rawLinesSum),
    discountAmount,
    taxableValue,
    cgstAmount,
    sgstAmount,
    totalTax,
    grandTotal,
    estimatedProfit,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
