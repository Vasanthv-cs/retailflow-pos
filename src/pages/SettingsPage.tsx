import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { usePOS } from '@/src/hooks/usePOS';

export function SettingsPage() {
  const { settings, updateSettings } = usePOS();
  const [form, setForm] = useState(settings);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim()) return setError('Store name cannot be empty.');
    if (!form.gstin.trim() || form.gstin.trim().length < 10) {
      return setError('Enter a valid store GSTIN.');
    }
    if (!form.phone.trim()) return setError('Store phone number is required.');
    setError('');
    updateSettings({
      ...form,
      storeName: form.storeName.trim(),
      legalName: form.legalName.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      receiptFooter: form.receiptFooter.trim(),
      defaultLowStockThreshold: Math.max(1, Number(form.defaultLowStockThreshold) || 10),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure store identity, GST billing defaults, barcode label headers, and 80mm thermal receipts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Business &amp; GST Profile</h2>
            <p className="text-xs text-slate-500">
              Displayed across the top navigation bar, barcode labels, and printed tax invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Store Display Name *
              </label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN *</label>
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Billing Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">POS Billing & Receipt Defaults</h2>
            <p className="text-xs text-slate-500">
              Controls GST calculation behavior on the POS terminal and default alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={form.defaultLowStockThreshold}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultLowStockThreshold: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.taxInclusivePricing}
                  onChange={(e) =>
                    setForm({ ...form, taxInclusivePricing: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Product selling prices are MRP (GST Inclusive)
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Thermal Receipt Footer Note
              </label>
              <textarea
                rows={2}
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Save Store Settings
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
