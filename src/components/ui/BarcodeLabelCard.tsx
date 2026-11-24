import { AlertTriangle } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import type { BarcodeLabelData } from '@/src/types/pos';

interface BarcodeLabelCardProps {
  label: BarcodeLabelData;
  mode?: 'preview' | 'print';
  className?: string;
}

/**
 * Renders a 50mm x 25mm thermal barcode label containing:
 * - Store name & unit micro-header
 * - Product name (clean 1-line retail label)
 * - Scannable Code 128 SVG barcode with quiet zone
 * - SKU / Barcode value (left) and Selling Price in INR (right)
 */
export function BarcodeLabelCard({
  label,
  mode = 'preview',
  className,
}: BarcodeLabelCardProps) {
  const isPrint = mode === 'print';

  if (!label.valid || !label.svgMarkup) {
    return (
      <div
        className={cn(
          'barcode-label-50x25 flex flex-col justify-between p-[2.2mm] border border-amber-300 bg-amber-50/70 text-amber-900',
          !isPrint && 'rounded-md shadow-xs',
          isPrint && 'barcode-label-print-item',
          className
        )}
      >
        <div className="flex items-center justify-between gap-1 text-[6.5pt] font-semibold uppercase tracking-wider text-amber-800">
          <span className="truncate">{label.storeName}</span>
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
        </div>
        <p className="text-[7.5pt] font-semibold text-slate-900 truncate leading-tight">
          {label.productName}
        </p>
        <p className="text-[6.5pt] text-amber-800 leading-snug">
          {label.error || 'Invalid barcode value'}
        </p>
        <div className="flex items-center justify-between border-t border-amber-200 pt-0.5 text-[6.5pt] font-mono">
          <span className="truncate">{label.sku}</span>
          <span className="font-bold text-slate-900 tabular-nums">{label.formattedPrice}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'barcode-label-50x25 flex flex-col justify-between bg-white text-slate-950 select-none',
        isPrint
          ? 'barcode-label-print-item px-[2.4mm] py-[1.8mm]'
          : 'px-[2.4mm] py-[1.8mm] rounded-md border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-colors',
        className
      )}
    >
      {/* Store Name + Unit */}
      <div className="flex items-center justify-between gap-1.5 leading-none">
        <span className="text-[6pt] font-semibold uppercase tracking-[0.06em] text-slate-500 truncate">
          {label.storeName}
        </span>
        <span className="text-[5.5pt] font-medium text-slate-400 shrink-0 uppercase">
          {label.unit}
        </span>
      </div>

      {/* Product Name */}
      <p className="text-[7.2pt] font-semibold text-slate-950 truncate leading-tight mt-[0.4mm]">
        {label.productName}
      </p>

      {/* Code 128 SVG Barcode (with subtle horizontal quiet zone for reliable scanning) */}
      <div
        className="w-full h-[9.2mm] px-[1.5mm] my-[0.5mm] flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: label.svgMarkup }}
      />

      {/* Footer: Code/SKU + INR Selling Price */}
      <div className="flex items-baseline justify-between gap-1.5 border-t border-slate-200/80 pt-[0.6mm] leading-none">
        <div className="min-w-0 flex items-baseline gap-1 font-mono text-[6pt] text-slate-700 truncate">
          <span className="truncate">{label.barcodeValue}</span>
          {label.source === 'barcode' && label.sku && label.sku !== label.barcodeValue && (
            <span className="text-[5.5pt] text-slate-400 shrink-0">· {label.sku}</span>
          )}
        </div>
        <span className="font-mono text-[8pt] font-bold text-slate-950 tabular-nums shrink-0">
          {label.formattedPrice}
        </span>
      </div>
    </div>
  );
}
