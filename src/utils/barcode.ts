import JsBarcode from 'jsbarcode';
import { formatINR } from '@/src/utils/format';
import type { BarcodeLabelQueueItem, Product } from '@/src/types/pos';

export type BarcodeSource = 'barcode' | 'sku';
export type BarcodePrintLayout = 'thermal-roll' | 'a4-sheet';
export type ScopedPrintMode = 'receipt' | 'barcode-thermal' | 'barcode-a4';

export const THERMAL_LABEL_DIMENSIONS_MM = {
  width: 50,
  height: 25,
} as const;

export const A4_LABEL_GRID_SPEC = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  columns: 3,
  rows: 10,
  labelsPerPage: 30,
  labelWidthMm: 50,
  labelHeightMm: 25,
} as const;

export const MAX_LABELS_PER_PRODUCT = 200;
export const MIN_BARCODE_LENGTH = 3;
export const MAX_BARCODE_LENGTH = 40;

export interface BarcodeValidationResult {
  valid: boolean;
  normalizedValue: string;
  error?: string;
}

export interface Code128RenderOptions {
  /** Module bar width in SVG coordinate units. Tuned for 50mm x 25mm thermal scanners. */
  barWidth?: number;
  /** Bar height in SVG coordinate units. Higher bars improve handheld scanner lock-on. */
  barHeight?: number;
  /** Left/right quiet zone margin in SVG units (minimum 10x narrow bar recommended). */
  quietZone?: number;
}

export interface Code128SvgResult {
  ok: boolean;
  svgMarkup?: string;
  normalizedValue?: string;
  error?: string;
}

export interface BarcodeLabelSpec {
  key: string;
  productId: string;
  copyIndex: number;
  totalCopies: number;
  storeName: string;
  productName: string;
  sku: string;
  barcodeSource: BarcodeSource;
  barcodeValue: string;
  sellingPrice: number;
  formattedPrice: string;
  unit: string;
  valid: boolean;
  svgMarkup?: string;
  error?: string;
}

export interface BarcodeBatchOptions {
  storeName: string;
  source: BarcodeSource;
  fallbackToSku?: boolean;
  renderOptions?: Code128RenderOptions;
}

export interface BarcodeInvalidEntry {
  productId: string;
  productName: string;
  sku: string;
  attemptedValue: string;
  error: string;
}

export interface BarcodeLabelBatchResult {
  labels: BarcodeLabelSpec[];
  totalLabels: number;
  validLabels: number;
  invalidLabels: number;
  invalidEntries: BarcodeInvalidEntry[];
  a4PagesNeeded: number;
}

/**
 * Validates that a candidate value is safe, non-empty, printable ASCII, and compact
 * enough for reliable Code 128 optical scanning on a 50mm x 25mm thermal label.
 */
export function validateCode128Value(
  rawValue: string | undefined | null
): BarcodeValidationResult {
  const normalizedValue = (rawValue ?? '').trim();

  if (!normalizedValue) {
    return {
      valid: false,
      normalizedValue: '',
      error: 'Missing barcode value. Enter a product barcode or switch source to SKU.',
    };
  }

  if (normalizedValue.length < MIN_BARCODE_LENGTH) {
    return {
      valid: false,
      normalizedValue,
      error: `Value must be at least ${MIN_BARCODE_LENGTH} characters for scanner accuracy.`,
    };
  }

  if (normalizedValue.length > MAX_BARCODE_LENGTH) {
    return {
      valid: false,
      normalizedValue,
      error: `Value exceeds ${MAX_BARCODE_LENGTH} characters and is too dense for a 50mm label.`,
    };
  }

  for (let i = 0; i < normalizedValue.length; i += 1) {
    const code = normalizedValue.charCodeAt(i);
    if (code < 32 || code > 126) {
      return {
        valid: false,
        normalizedValue,
        error: 'Contains non-ASCII characters unsupported by standard Code 128.',
      };
    }
  }

  return { valid: true, normalizedValue };
}

/**
 * Resolves which code value to encode for a product according to the selected source.
 */
export function resolveProductBarcodeValue(
  product: Pick<Product, 'barcode' | 'sku'>,
  source: BarcodeSource,
  fallbackToSku = false
): { value: string; resolvedSource: BarcodeSource } {
  if (source === 'sku') {
    return { value: (product.sku ?? '').trim(), resolvedSource: 'sku' };
  }
  const barcode = (product.barcode ?? '').trim();
  if (barcode) {
    return { value: barcode, resolvedSource: 'barcode' };
  }
  if (fallbackToSku) {
    return { value: (product.sku ?? '').trim(), resolvedSource: 'sku' };
  }
  return { value: '', resolvedSource: 'barcode' };
}

/**
 * Minimal virtual SVG node + XMLDocument adapter so `jsbarcode` can generate pure,
 * deterministic Code 128 SVG markup in both browser and Node/tsx test environments
 * without requiring jsdom or external DOM polyfills.
 */
interface VirtualSvgNode {
  tagName: string;
  nodeName: string;
  attributes: Record<string, string>;
  children: VirtualSvgNode[];
  textContent: string;
  setAttribute: (name: string, value: string) => void;
  setAttributeNS: (_ns: string | null, name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  removeAttribute: (name: string) => void;
  appendChild: (child: VirtualSvgNode) => VirtualSvgNode;
  removeChild: (child: VirtualSvgNode) => VirtualSvgNode;
  hasChildNodes: () => boolean;
  readonly firstChild: VirtualSvgNode | null;
  readonly childNodes: VirtualSvgNode[];
  toSvgString: () => string;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createVirtualSvgNode(tagName: string): VirtualSvgNode {
  const attributes: Record<string, string> = {};
  const children: VirtualSvgNode[] = [];

  const node: VirtualSvgNode = {
    tagName,
    nodeName: tagName,
    attributes,
    children,
    textContent: '',
    setAttribute(name: string, value: string) {
      attributes[name] = String(value);
    },
    setAttributeNS(_ns: string | null, name: string, value: string) {
      attributes[name] = String(value);
    },
    getAttribute(name: string) {
      return name in attributes ? attributes[name] : null;
    },
    hasAttribute(name: string) {
      return name in attributes;
    },
    removeAttribute(name: string) {
      delete attributes[name];
    },
    appendChild(child: VirtualSvgNode) {
      children.push(child);
      return child;
    },
    removeChild(child: VirtualSvgNode) {
      const idx = children.indexOf(child);
      if (idx >= 0) children.splice(idx, 1);
      return child;
    },
    hasChildNodes() {
      return children.length > 0;
    },
    get firstChild() {
      return children[0] ?? null;
    },
    get childNodes() {
      return children;
    },
    toSvgString() {
      if (tagName === '#text') {
        return escapeXmlAttr(node.textContent);
      }
      const attrEntries = Object.entries(attributes)
        .map(([k, v]) => `${k}="${escapeXmlAttr(v)}"`)
        .join(' ');
      const openTag = attrEntries ? `<${tagName} ${attrEntries}>` : `<${tagName}>`;
      if (children.length === 0 && !node.textContent) {
        return attrEntries ? `<${tagName} ${attrEntries} />` : `<${tagName} />`;
      }
      const inner = children.map((c) => c.toSvgString()).join('') + escapeXmlAttr(node.textContent);
      return `${openTag}${inner}</${tagName}>`;
    },
  };

  return node;
}

function createVirtualXmlDocument() {
  return {
    createElementNS(_ns: string, tagName: string) {
      return createVirtualSvgNode(tagName);
    },
    createTextNode(text: string) {
      const textNode = createVirtualSvgNode('#text');
      textNode.textContent = String(text);
      return textNode;
    },
  };
}

/**
 * Generates clean, high-contrast Code 128 SVG markup optimized for 50mm x 25mm
 * thermal barcode printers. Returns a structured result with explicit error handling.
 */
export function generateCode128Svg(
  rawValue: string | undefined | null,
  options: Code128RenderOptions = {}
): Code128SvgResult {
  const validation = validateCode128Value(rawValue);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
    };
  }

  const barWidth = options.barWidth ?? 1.6;
  const barHeight = options.barHeight ?? 44;
  const quietZone = options.quietZone ?? 10;

  try {
    const virtualDoc = createVirtualXmlDocument();
    const svgRoot = createVirtualSvgNode('svg');

    JsBarcode(svgRoot as unknown as SVGSVGElement, validation.normalizedValue, {
      format: 'CODE128',
      xmlDocument: virtualDoc as unknown as Document,
      displayValue: false,
      background: '#FFFFFF',
      lineColor: '#000000',
      width: barWidth,
      height: barHeight,
      margin: 0,
      marginLeft: quietZone,
      marginRight: quietZone,
      marginTop: 2,
      marginBottom: 2,
      flat: true,
    });

    // Normalize width/height so the vector barcode scales cleanly into the 50mm label
    // while preserving exact bar proportions via viewBox.
    const viewBox = svgRoot.getAttribute('viewBox');
    if (viewBox) {
      svgRoot.setAttribute('width', '100%');
      svgRoot.setAttribute('height', '100%');
      svgRoot.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgRoot.setAttribute('shape-rendering', 'crispEdges');
    }
    svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgRoot.setAttribute('role', 'img');
    svgRoot.setAttribute('aria-label', `Code 128 barcode ${validation.normalizedValue}`);

    return {
      ok: true,
      svgMarkup: svgRoot.toSvgString(),
      normalizedValue: validation.normalizedValue,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Barcode encoding failed: ${err.message}`
          : 'Unable to encode Code 128 barcode for this value.',
    };
  }
}

/**
 * Clamps per-product label print quantity to safe integer bounds.
 */
export function clampLabelQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(MAX_LABELS_PER_PRODUCT, Math.floor(quantity)));
}

/**
 * Truncates long retail product names neatly so a 50mm x 25mm thermal label never wraps
 * into the barcode quiet zone.
 */
export function compactLabelText(text: string, maxChars: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

/**
 * Builds the flat, expanded print batch from the queued products and quantities.
 * Caches SVG generation per product so printing 50 copies of a SKU computes SVG once.
 */
export function buildBarcodeLabelBatch(
  products: Product[],
  queue: BarcodeLabelQueueItem[],
  options: BarcodeBatchOptions
): BarcodeLabelBatchResult {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const labels: BarcodeLabelSpec[] = [];
  const invalidEntries: BarcodeInvalidEntry[] = [];
  let validLabels = 0;
  let invalidLabels = 0;

  const storeTitle = compactLabelText(options.storeName || 'RetailFlow POS', 26);

  for (const item of queue) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const copies = clampLabelQuantity(item.quantity);
    const resolved = resolveProductBarcodeValue(
      product,
      options.source,
      Boolean(options.fallbackToSku)
    );
    const svgResult = generateCode128Svg(resolved.value, options.renderOptions);
    const formattedPrice = formatINR(product.sellingPrice);
    const compactName = compactLabelText(product.name, 28);

    if (!svgResult.ok) {
      invalidEntries.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        attemptedValue: resolved.value,
        error: svgResult.error ?? 'Invalid barcode value.',
      });
      invalidLabels += copies;
    } else {
      validLabels += copies;
    }

    for (let copyIndex = 1; copyIndex <= copies; copyIndex += 1) {
      labels.push({
        key: `${product.id}-${copyIndex}`,
        productId: product.id,
        copyIndex,
        totalCopies: copies,
        storeName: storeTitle,
        productName: compactName,
        sku: product.sku,
        barcodeSource: resolved.resolvedSource,
        barcodeValue: svgResult.normalizedValue ?? resolved.value,
        sellingPrice: product.sellingPrice,
        formattedPrice,
        unit: product.unit,
        valid: svgResult.ok,
        svgMarkup: svgResult.svgMarkup,
        error: svgResult.error,
      });
    }
  }

  const totalLabels = labels.length;
  const a4PagesNeeded =
    totalLabels > 0 ? Math.ceil(totalLabels / A4_LABEL_GRID_SPEC.labelsPerPage) : 0;

  return {
    labels,
    totalLabels,
    validLabels,
    invalidLabels,
    invalidEntries,
    a4PagesNeeded,
  };
}

/**
 * Chunks a flat label array into A4 sticker-sheet pages (30 labels per A4 page).
 */
export function paginateLabelsForA4(labels: BarcodeLabelSpec[]): BarcodeLabelSpec[][] {
  const pages: BarcodeLabelSpec[][] = [];
  const perPage = A4_LABEL_GRID_SPEC.labelsPerPage;
  for (let i = 0; i < labels.length; i += perPage) {
    pages.push(labels.slice(i, i + perPage));
  }
  return pages;
}

const DYNAMIC_PRINT_STYLE_ID = 'retailflow-scoped-print-page-rule';

/**
 * Triggers browser printing with an isolated `@page` rule and `data-print-mode` attribute
 * so 50mm x 25mm thermal rolls, A4 sticker sheets, and 80mm POS receipts never interfere.
 */
export function triggerScopedPrint(mode: ScopedPrintMode): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let styleEl = document.getElementById(DYNAMIC_PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = DYNAMIC_PRINT_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  if (mode === 'barcode-thermal') {
    styleEl.textContent = `@page { size: ${THERMAL_LABEL_DIMENSIONS_MM.width}mm ${THERMAL_LABEL_DIMENSIONS_MM.height}mm; margin: 0; }`;
  } else if (mode === 'barcode-a4') {
    styleEl.textContent = `@page { size: A4 portrait; margin: 10mm; }`;
  } else {
    styleEl.textContent = `@page { size: 80mm auto; margin: 0; }`;
  }

  document.body.setAttribute('data-print-mode', mode);

  const cleanup = () => {
    document.body.removeAttribute('data-print-mode');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}
