import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { usePOS } from '@/src/hooks/usePOS';
import { formatINR } from '@/src/utils/format';
import type { Employee, EmployeeRole } from '@/src/types/pos';

const ROLES: EmployeeRole[] = [
  'Store Manager',
  'Head Cashier',
  'Cashier',
  'Inventory Clerk',
  'Accountant',
];

const SHIFTS: Employee['shift'][] = [
  'Morning (7 AM - 3 PM)',
  'Evening (2 PM - 10 PM)',
  'Full Day (9 AM - 6 PM)',
];

const EMPTY_EMP = {
  name: '',
  employeeCode: '',
  role: 'Cashier' as EmployeeRole,
  email: '',
  phone: '',
  shift: 'Morning (7 AM - 3 PM)' as Employee['shift'],
  status: 'Active' as Employee['status'],
  joinedDate: new Date().toISOString().slice(0, 10),
};

export function EmployeesPage() {
  const { employees, sales, addEmployee, updateEmployee, toggleEmployeeStatus } = usePOS();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [error, setError] = useState('');

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_EMP,
      employeeCode: `RF-${101 + employees.length}`,
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      employeeCode: emp.employeeCode,
      role: emp.role,
      email: emp.email,
      phone: emp.phone,
      shift: emp.shift,
      status: emp.status,
      joinedDate: emp.joinedDate,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Staff member name is required.');
    if (!form.email.trim() || !form.email.includes('@')) {
      return setError('Enter a valid email address.');
    }
    if (!form.phone.trim()) return setError('Phone number is required.');

    if (editing) {
      updateEmployee(editing.id, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
    } else {
      addEmployee({
        ...form,
        name: form.name.trim(),
        employeeCode: form.employeeCode.trim() || `RF-${101 + employees.length}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage store cashiers, shifts, register permissions, and billing performance.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Bills Processed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const empSales = sales.filter((s) => s.cashierId === emp.id);
                const empTotal = empSales.reduce((acc, s) => acc + s.totalAmount, 0);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{emp.name}</p>
                      <p className="font-mono text-xs text-slate-400">
                        {emp.employeeCode} · Joined {emp.joinedDate}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700">{emp.role}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{emp.shift}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="text-slate-700">{emp.email}</p>
                      <p className="font-mono text-slate-400">{emp.phone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums">
                      <p className="font-semibold text-slate-900">{empSales.length} bills</p>
                      <p className="text-slate-400">{formatINR(empTotal)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium">
                      <span
                        className={
                          emp.status === 'Active' ? 'text-emerald-700' : 'text-slate-400'
                        }
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => toggleEmployeeStatus(emp.id)}
                          className="text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(emp)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
                          title="Edit employee"
                        >
                          <Pencil className="h-4 w-4" />
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
        title={editing ? 'Edit Employee' : 'Add Employee'}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="emp-form">
              {editing ? 'Save Changes' : 'Add Staff Member'}
            </Button>
          </>
        }
      >
        <form id="emp-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Employee Code
              </label>
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Shift</label>
              <select
                value={form.shift}
                onChange={(e) =>
                  setForm({ ...form, shift: e.target.value as Employee['shift'] })
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
