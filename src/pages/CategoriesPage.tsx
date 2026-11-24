import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { usePOS } from '@/src/hooks/usePOS';
import { formatINR } from '@/src/utils/format';
import type { Category } from '@/src/types/pos';

export function CategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory, addToast } = usePOS();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultGstRate, setDefaultGstRate] = useState('5');
  const [error, setError] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDefaultGstRate('5');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setDefaultGstRate(String(cat.defaultGstRate));
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Category name is required.');
    const gst = parseFloat(defaultGstRate);
    if (Number.isNaN(gst) || gst < 0 || gst > 28) {
      return setError('Default GST rate must be between 0 and 28%.');
    }
    if (editing) {
      updateCategory(editing.id, {
        name: name.trim(),
        description: description.trim(),
        defaultGstRate: gst,
      });
    } else {
      addCategory({
        name: name.trim(),
        description: description.trim(),
        defaultGstRate: gst,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (cat: Category) => {
    const res = deleteCategory(cat.id);
    if (!res.ok) {
      addToast('Cannot delete category', 'error', res.error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Organize store departments and default GST slabs for faster SKU onboarding.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Category Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Default GST</th>
                <th className="px-4 py-3 text-right">SKUs</th>
                <th className="px-4 py-3 text-right">Units in Stock</th>
                <th className="px-4 py-3 text-right">Retail Value</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => {
                const catProducts = products.filter((p) => p.categoryId === cat.id);
                const totalUnits = catProducts.reduce((s, p) => s + p.stock, 0);
                const retailVal = catProducts.reduce(
                  (s, p) => s + p.stock * p.sellingPrice,
                  0
                );
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{cat.name}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs">
                      {cat.description || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {cat.defaultGstRate}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-900 tabular-nums">
                      {catProducts.length}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {totalUnits}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {formatINR(retailVal)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
                          title="Edit category"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
        title={editing ? 'Edit Category' : 'New Category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="category-form">
              {editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Baby Care"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Default GST Slab (%)
            </label>
            <select
              value={defaultGstRate}
              onChange={(e) => setDefaultGstRate(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
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
