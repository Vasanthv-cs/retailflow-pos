import assert from 'node:assert/strict';
import {
  A4_LABEL_GRID_SPEC,
  buildBarcodeLabelBatch,
  clampLabelQuantity,
  compactLabelText,
  generateCode128Svg,
  paginateLabelsForA4,
  resolveProductBarcodeValue,
  THERMAL_LABEL_DIMENSIONS_MM,
  validateCode128Value,
} from '../barcode';
import type { Product } from '../../types/pos';

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const sampleProducts: Product[] = [
  {
    id: 'p-1',
    name: 'Deccan Aged Basmati Rice 5kg Extra Long Premium Grain',
    brand: 'Deccan Harvest',
    sku: 'GRN-1001',
    barcode: '890100100101',
    hsnCode: '1006',
    categoryId: 'cat-1',
    unit: 'Bag',
    purchasePrice: 465,
    sellingPrice: 560,
    gstRate: 5,
    stock: 42,
    lowStockThreshold: 12,
    supplierId: 'sup-1',
    location: 'Main Store Floor',
    status: 'Active',
  },
  {
    id: 'p-2',
    name: 'Loose Organic Jaggery 500g',
    brand: 'Vindhya Farms',
    sku: 'GRN-1099',
    barcode: '',
    hsnCode: '1701',
    categoryId: 'cat-1',
    unit: 'Pack',
    purchasePrice: 65,
    sellingPrice: 90,
    gstRate: 0,
    stock: 15,
    lowStockThreshold: 5,
    supplierId: 'sup-1',
    location: 'Main Store Floor',
    status: 'Active',
  },
];

runTest('thermal dimensions default to standard 50mm x 25mm', () => {
  assert.equal(THERMAL_LABEL_DIMENSIONS_MM.width, 50);
  assert.equal(THERMAL_LABEL_DIMENSIONS_MM.height, 25);
  assert.equal(A4_LABEL_GRID_SPEC.labelsPerPage, 30);
});

runTest('validateCode128Value accepts standard numeric EAN/UPC and alphanumeric SKUs', () => {
  const ean = validateCode128Value(' 890100100101 ');
  assert.equal(ean.valid, true);
  assert.equal(ean.normalizedValue, '890100100101');

  const sku = validateCode128Value('GRN-1001');
  assert.equal(sku.valid, true);
  assert.equal(sku.normalizedValue, 'GRN-1001');
});

runTest('validateCode128Value rejects empty, short, overly dense, and non-ASCII inputs', () => {
  assert.equal(validateCode128Value('').valid, false);
  assert.equal(validateCode128Value('   ').valid, false);
  assert.equal(validateCode128Value('12').valid, false);
  assert.equal(validateCode128Value('A'.repeat(41)).valid, false);
  assert.equal(validateCode128Value('890100₹101').valid, false);
});

runTest('generateCode128Svg returns clean high-contrast vector SVG markup', () => {
  const res = generateCode128Svg('890100100101');
  assert.equal(res.ok, true);
  assert.ok(res.svgMarkup);
  assert.match(res.svgMarkup!, /^<svg\s/);
  assert.match(res.svgMarkup!, /viewBox="/);
  assert.match(res.svgMarkup!, /<rect\s/);
  assert.match(res.svgMarkup!, /fill:#000000|fill="#000000"/i);
  assert.match(res.svgMarkup!, /<\/svg>$/);
});

runTest('generateCode128Svg handles invalid inputs gracefully without throwing', () => {
  const empty = generateCode128Svg('');
  assert.equal(empty.ok, false);
  assert.ok(empty.error && empty.error.length > 0);

  const unicode = generateCode128Svg('BAD-₹-CODE');
  assert.equal(unicode.ok, false);
  assert.ok(unicode.error && unicode.error.includes('non-ASCII'));
});

runTest('resolveProductBarcodeValue switches between barcode and SKU with optional fallback', () => {
  assert.deepEqual(resolveProductBarcodeValue(sampleProducts[0], 'barcode', false), {
    value: '890100100101',
    resolvedSource: 'barcode',
  });
  assert.deepEqual(resolveProductBarcodeValue(sampleProducts[0], 'sku', false), {
    value: 'GRN-1001',
    resolvedSource: 'sku',
  });
  assert.deepEqual(resolveProductBarcodeValue(sampleProducts[1], 'barcode', false), {
    value: '',
    resolvedSource: 'barcode',
  });
  assert.deepEqual(resolveProductBarcodeValue(sampleProducts[1], 'barcode', true), {
    value: 'GRN-1099',
    resolvedSource: 'sku',
  });
});

runTest('buildBarcodeLabelBatch expands quantities, reports invalid items, and paginates A4', () => {
  const batch = buildBarcodeLabelBatch(
    sampleProducts,
    [
      { productId: 'p-1', quantity: 32 },
      { productId: 'p-2', quantity: 2 },
    ],
    {
      storeName: 'Annapurna Fresh Mart',
      source: 'barcode',
      fallbackToSku: false,
    }
  );

  assert.equal(batch.totalLabels, 34);
  assert.equal(batch.validLabels, 32);
  assert.equal(batch.invalidLabels, 2);
  assert.equal(batch.invalidEntries.length, 1);
  assert.equal(batch.invalidEntries[0].productId, 'p-2');
  assert.equal(batch.a4PagesNeeded, 2);

  const first = batch.labels[0];
  assert.equal(first.valid, true);
  assert.equal(first.formattedPrice, '₹560.00');
  assert.ok(first.productName.length <= 28);
  assert.ok(first.svgMarkup?.includes('<svg'));

  const pages = paginateLabelsForA4(batch.labels);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].length, 30);
  assert.equal(pages[1].length, 4);
});

runTest('clampLabelQuantity and compactLabelText enforce safe bounds', () => {
  assert.equal(clampLabelQuantity(0), 1);
  assert.equal(clampLabelQuantity(-5), 1);
  assert.equal(clampLabelQuantity(999), 200);
  assert.equal(clampLabelQuantity(4.8), 4);
  assert.equal(compactLabelText('  Short Name  ', 20), 'Short Name');
  assert.equal(compactLabelText('Very Long Retail Product Description', 15).length, 15);
});

console.log('\nAll barcode utility tests passed.');
