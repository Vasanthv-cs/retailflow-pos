import { Printer } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { usePOS } from '@/src/hooks/usePOS';
import { triggerScopedPrint } from '@/src/utils/barcode';
import { formatDateTime, formatINR } from '@/src/utils/format';
import type { Sale } from '@/src/types/pos';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  const { settings } = usePOS();

  if (!sale) return null;

  return (
    <Modal
      open={Boolean(sale)}
      onClose={onClose}
      title={`Tax Invoice Receipt · ${sale.invoiceNumber}`}
      subtitle="80mm thermal bill preview (simulated transaction)"
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => triggerScopedPrint('receipt')}>
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </>
      }
    >
      <div
        id="thermal-receipt-printable"
        className="mx-auto w-full max-w-[330px] rounded-lg border border-slate-200 bg-slate-50/50 p-5 font-mono text-xs text-slate-800"
      >
        <div className="text-center border-b border-dashed border-slate-300 pb-3">
          <p className="font-sans text-base font-bold text-slate-900">{settings.storeName}</p>
          <p className="mt-0.5 text-[11px] text-slate-600">{settings.legalName}</p>
          <p className="mt-1 text-[11px] text-slate-600">
            {settings.address}, {settings.city} - {settings.pincode}
          </p>
          <p className="text-[11px] text-slate-600">Tel: {settings.phone}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-900">
            GSTIN: {settings.gstin}
          </p>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice:</span>
            <span className="font-semibold text-slate-900">{sale.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span>{formatDateTime(sale.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="truncate max-w-[180px]">{sale.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cashier:</span>
            <span>{sale.cashierName}</span>
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300">
          <div className="grid grid-cols-12 pb-1.5 text-[10px] font-semibold text-slate-500 border-b border-slate-200">
            <span className="col-span-6">ITEM</span>
            <span className="col-span-2 text-right">QTY</span>
            <span className="col-span-4 text-right">AMT</span>
          </div>
          <div className="divide-y divide-slate-200/70">
            {sale.items.map((item) => (
              <div key={item.productId} className="py-1.5">
                <div className="grid grid-cols-12 items-start">
                  <span className="col-span-6 pr-1 font-sans text-[11px] font-medium text-slate-900 leading-tight">
                    {item.productName}
                  </span>
                  <span className="col-span-2 text-right tabular-nums">{item.quantity}</span>
                  <span className="col-span-4 text-right tabular-nums font-medium">
                    {formatINR(item.lineTotal)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 tabular-nums">
                  {formatINR(item.unitPrice)} × {item.quantity} · GST {item.gstRate}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Taxable Subtotal</span>
            <span>{formatINR(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>-{formatINR(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">CGST</span>
            <span>{formatINR(sale.cgstAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SGST</span>
            <span>{formatINR(sale.sgstAmount)}</span>
          </div>
          <div className="flex justify-between pt-1.5 mt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>GRAND TOTAL</span>
            <span>{formatINR(sale.totalAmount)}</span>
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Mode</span>
            <span className="font-semibold text-slate-900">{sale.paymentMethod} (Simulated)</span>
          </div>
          {sale.paymentReference && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ref No.</span>
              <span>{sale.paymentReference}</span>
            </div>
          )}
          {sale.paymentMethod === 'Cash' && sale.amountTendered !== undefined && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Tendered</span>
                <span>{formatINR(sale.amountTendered)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Change Returned</span>
                <span>{formatINR(sale.changeDue ?? 0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="pt-3 text-center text-[10px] leading-relaxed text-slate-500 font-sans">
          <p>{settings.receiptFooter}</p>
          <p className="mt-1.5 font-mono text-[10px] text-slate-400">
            Prototype simulation — no real payment processed
          </p>
        </div>
      </div>
    </Modal>
  );
}
