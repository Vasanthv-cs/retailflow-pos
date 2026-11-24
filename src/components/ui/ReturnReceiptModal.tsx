import { Printer } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { usePOS } from '@/src/hooks/usePOS';
import { triggerScopedPrint } from '@/src/utils/barcode';
import { formatDateTime, formatINR } from '@/src/utils/format';
import type { Return } from '@/src/types/pos';

interface ReturnReceiptModalProps {
  returnRecord: Return | null;
  onClose: () => void;
}

export function ReturnReceiptModal({ returnRecord, onClose }: ReturnReceiptModalProps) {
  const { settings } = usePOS();

  if (!returnRecord) return null;

  return (
    <Modal
      open={Boolean(returnRecord)}
      onClose={onClose}
      title={`Return Credit Receipt · ${returnRecord.returnNumber}`}
      subtitle="80mm thermal return & simulated refund slip"
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => triggerScopedPrint('receipt')}>
            <Printer className="h-4 w-4" />
            Print Return Receipt
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
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
            Sales Return / Credit Note
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {settings.address}, {settings.city} - {settings.pincode}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-900">
            GSTIN: {settings.gstin}
          </p>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Return Slip:</span>
            <span className="font-semibold text-slate-900">{returnRecord.returnNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Orig. Invoice:</span>
            <span className="font-semibold text-slate-900">{returnRecord.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date:</span>
            <span>{formatDateTime(returnRecord.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="truncate max-w-[180px]">{returnRecord.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Processed By:</span>
            <span>{returnRecord.processedBy}</span>
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300">
          <div className="grid grid-cols-12 pb-1.5 text-[10px] font-semibold text-slate-500 border-b border-slate-200">
            <span className="col-span-6">RETURNED ITEM</span>
            <span className="col-span-2 text-right">QTY</span>
            <span className="col-span-4 text-right">REFUND</span>
          </div>
          <div className="divide-y divide-slate-200/70">
            {returnRecord.items.map((item) => (
              <div key={item.productId} className="py-1.5">
                <div className="grid grid-cols-12 items-start">
                  <span className="col-span-6 pr-1 font-sans text-[11px] font-medium text-slate-900 leading-tight">
                    {item.productName}
                  </span>
                  <span className="col-span-2 text-right tabular-nums">{item.quantity}</span>
                  <span className="col-span-4 text-right tabular-nums font-medium">
                    {formatINR(item.refundAmount)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {item.sku} · {item.condition === 'Sellable' ? 'Restocked' : 'Damaged write-off'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Reason</span>
            <span className="text-right max-w-[190px] font-sans">{returnRecord.reason}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Inventory Action</span>
            <span className="font-sans">
              {returnRecord.restockItems ? 'Restored to stock' : 'Not restocked (Damaged)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Refund Mode</span>
            <span className="font-semibold text-slate-900">
              {returnRecord.refundMethod} (Simulated)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Refund Ref</span>
            <span>{returnRecord.refundReference}</span>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>TOTAL REFUND</span>
            <span>{formatINR(returnRecord.totalRefund)}</span>
          </div>
        </div>

        <div className="pt-3 text-center text-[10px] leading-relaxed text-slate-500 font-sans">
          <p>Please retain this return slip for your billing records.</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">
            Prototype simulation — no real payout processed
          </p>
        </div>
      </div>
    </Modal>
  );
}
