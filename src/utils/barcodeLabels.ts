import JsBarcode from 'jsbarcode';
import { formatINR } from '@/src/utils/format';
import type {
  BarcodeLabelData,
  BarcodeLabelQueueItem,
  BarcodePrintLayout,
  BarcodeSource,
  BarcodeValidationResult,
  Product,
} from '@/src/types/pos';

/** Standard Indian retail thermal barcode label stock dimensions (in mm) */
export const THERMAL_LABEL_DIMENSIONS_MM = {
  width: 50,
  height: 25,
} as const;

const PRINTABLE_ASCII_REGEX = /^[\x20-\x7E]+$/;
const MAX_CODE128_LENGTH = 28;

/**
 * Validates that a candidate string can be reliably encoded as Code 128
 * and scanned cleanly within a 50mm x 25mm thermal barcode label.
 */
export function validateCode128Value(rawValue?: string | null): BarcodeValidationResult {
  const sanitizedValue = (rawValue ?? '').trim();

  if (!sanitizedValue) {
    return {
      valid: false,
      sanitizedValue: '',
      error: 'Missing barcode/SKU value',
    };
  }

  if (!PRINTABLE_ASCII_REGEX.test(sanitizedValue)) {
    return {
      valid: false,
      sanitizedValue,
      error: 'Contains unsupported non-ASCII characters for Code 128',
    };
  }

  if (sanitizedValue.length > MAX_CODE128_LENGTH) {
    return {
      valid: false,
      sanitizedValue,
      error: `Exceeds ${MAX_CODE128_LENGTH} characters (too dense for 50mm label)`,
    };
  }

  return {
    valid: true,
    sanitizedValue,
  };
}

export interface Code128SvgOptions {
  barWidth?: number;
  barHeight?: number;
  lineColor?: string;
}

/**
 * Generates crisp Code 128 SVG markup using JsBarcode.
 * Returns { valid, svgMarkup, error } so callers can gracefully display fallbacks.
 */
export function generateCode128Svg(
  rawValue?: string | null,
  options?: Code128SvgOptions
): { valid: boolean; svgMarkup: string | null; error?: string } {
  const validation = validateCode128Value(rawValue);
  if (!validation.valid) {
    return { valid: false, svgMarkup: null, error: validation.error };
  }

  if (typeof document === 'undefined') {
    return { valid: false, svgMarkup: null, error: 'DOM unavailable for SVG generation' };
  }

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, validation.sanitizedValue, {
      format: 'CODE128',
      width: options?.barWidth ?? 1.4,
      height: options?.barHeight ?? 28,
      margin: 0,
      displayValue: false,
      background: 'transparent',
      lineColor: options?.lineColor ?? '#0f172a',
    });

    const intrinsicWidth = svg.getAttribute('width')?.replace('px', '') || '140';
    const intrinsicHeight = svg.getAttribute('height')?.replace('px', '') || '28';
    svg.setAttribute('viewBox', `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Code 128 barcode ${validation.sanitizedValue}`);

    return {
      valid: true,
      svgMarkup: svg.outerHTML,
    };
  } catch (err) {
    return {
      valid: false,
      svgMarkup: null,
      error: err instanceof Error ? err.message : 'Unable to encode Code 128 barcode',
    };
  }
}

/**
 * Resolves the active encoding string for a product given the user's selected source
 * (`barcode` or `sku`).
 */
export function resolveProductBarcodeValue(
  product: Product,
  source: BarcodeSource
): string {
  return source === 'sku' ? product.sku : product.barcode;
}

/**
 * Expands a queued selection of products + copy counts into print-ready
 * 50mm x 25mm barcode label descriptors.
 */
export function buildPrintableLabelBatch(
  products: Product[],
  queue: BarcodeLabelQueueItem[],
  storeName: string,
  source: BarcodeSource
): BarcodeLabelData[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const expanded: BarcodeLabelData[] = [];
  const svgCache = new Map<string, { valid: boolean; svgMarkup: string | null; error?: string }>();

  for (const entry of queue) {
    const product = productMap.get(entry.productId);
    if (!product) continue;

    const copyCount = Math.max(1, Math.min(200, Math.floor(entry.quantity || 1)));
    const rawCode = resolveProductBarcodeValue(product, source);
    const cacheKey = `${source}:${rawCode}`;

    let generated = svgCache.get(cacheKey);
    if (!generated) {
      generated = generateCode128Svg(rawCode);
      svgCache.set(cacheKey, generated);
    }

    const formattedPrice = formatINR(product.sellingPrice);

    for (let i = 0; i < copyCount; i += 1) {
      expanded.push({
        key: `${product.id}-${source}-${i}`,
        productId: product.id,
        copyIndex: i + 1,
        copyCount,
        storeName: storeName.trim() || 'RetailFlow POS',
        productName: product.name,
        sku: product.sku,
        barcodeValue: rawCode.trim(),
        source,
        sellingPrice: product.sellingPrice,
        formattedPrice,
        unit: product.unit,
        svgMarkup: generated.svgMarkup,
        valid: generated.valid,
        error: generated.error,
      });
    }
  }

  return expanded;
}

/**
 * Coordinates browser printing specifically for the `#barcode-labels-printable` container
 * with exact @page dimensions (50mm x 25mm thermal roll or A4 sheet), then restores
 * normal document print state immediately after printing completes.
 */
export function triggerBarcodeLabelPrint(layout: BarcodePrintLayout): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const styleId = 'retailflow-barcode-page-style';
  document.getElementById(styleId)?.remove();

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent =
    layout === 'thermal-roll'
      ? `@media print { @page { size: ${THERMAL_LABEL_DIMENSIONS_MM.width}mm ${THERMAL_LABEL_DIMENSIONS_MM.height}mm; margin: 0; } }`
      : `@media print { @page { size: A4 portrait; margin: 6mm; } }`;
  document.head.appendChild(styleEl);

  const layoutClass = `print-layout-${layout}`;
  document.body.classList.add('printing-barcode-labels', layoutClass);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('printing-barcode-labels', layoutClass);
    document.getElementById(styleId)?.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();

  // Safety fallback in case a browser does not dispatch afterprint inside an iframe
  window.setTimeout(cleanup, 1500);
}
