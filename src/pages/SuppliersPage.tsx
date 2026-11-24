import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { usePOS } from '@/src/hooks/usePOS';
import type { Supplier } from '@/src/types/pos';

const EMPTY_SUPPLIER = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  gstin: '',
  city: '',
  address: '',
  paymentTerms: 'Net 15 Days',
};

export function SuppliersPage() {
  const { suppliers, purchaseOrders, addSupplier, updateSupplier } = usePOS();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_SUPPLIER);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (sup: Supplier) => {
    setEditing(sup);
    setForm({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      gstin: sup.gstin,
      city: sup.city,
      address: sup.address,
      paymentTerms: sup.paymentTerms,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Supplier company name is required.');
    if (!form.contactPerson.trim()) return setError('Contact person is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');
    if (!form.gstin.trim() || form.gstin.trim().length < 10) {
      return setError('Enter a valid GSTIN (typically 15 characters).');
    }

    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      city: form.city.trim() || 'Bengaluru',
      address: form.address.trim(),
      paymentTerms: form.paymentTerms,
    };

    if (editing) {
      updateSupplier(editing.id, payload);
    } else {
      addSupplier(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain wholesale distributors, GSTIN billing profiles, and credit terms.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, contact, city, or GSTIN..."
            className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Supplier</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3 text-right">Purchase Orders</th>
                <th className="px-5 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sup) => {
                const poCount = purchaseOrders.filter((po) => po.supplierId === sup.id).length;
                return (
                  <tr key={sup.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{sup.name}</p>
                      <p className="text-xs text-slate-400">
                        {sup.city} · {sup.address}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-medium text-slate-800">{sup.contactPerson}</p>
                      <p className="text-slate-500 font-mono">{sup.phone}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-700">{sup.gstin}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{sup.paymentTerms}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {poCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(sup)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
                        title="Edit supplier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        maxWidthClass="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="supplier-form">
              {editing ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN *</label>
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                placeholder="29AABCD1928L1Z2"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase focus:border-indigo-500 focus:outline-none"
              />
            </div>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="Immediate / COD">Immediate / COD</option>
                <option value="Net 7 Days">Net 7 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
