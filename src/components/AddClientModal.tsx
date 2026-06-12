import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Client } from '../types';

interface Props { onClose: () => void }

export default function AddClientModal({ onClose }: Props) {
  const { addClient } = useStore();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    dateOfBirth: '', ssnLast4: '', monthlyFee: '99', referralSource: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client: Client = {
      id: `c${Date.now()}`,
      ...form,
      monthlyFee: Number(form.monthlyFee),
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      creditScores: [],
      accounts: [],
      disputes: [],
      letters: [],
      notes: [],
      tasks: [],
    };
    addClient(client);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">First Name *</label>
              <input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Last Name *</label>
              <input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone *</label>
              <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">SSN (Last 4)</label>
              <input maxLength={4} value={form.ssnLast4} onChange={e => set('ssnLast4', e.target.value)} placeholder="0000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date of Birth</label>
            <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <input maxLength={2} value={form.state} onChange={e => set('state', e.target.value)} placeholder="FL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">ZIP</label>
              <input value={form.zip} onChange={e => set('zip', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Monthly Fee ($)</label>
              <input type="number" value={form.monthlyFee} onChange={e => set('monthlyFee', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Referral Source</label>
              <input value={form.referralSource} onChange={e => set('referralSource', e.target.value)} placeholder="Facebook, Referral..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add Client</button>
          </div>
        </form>
      </div>
    </div>
  );
}
