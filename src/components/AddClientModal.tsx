import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Client } from '../types';

interface Props { onClose: () => void }

export default function AddClientModal({ onClose }: Props) {
  const { addClient } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    dateOfBirth: '', ssnLast4: '', monthlyFee: '99', referralSource: '',
    myScoreIQUsername: '', myScoreIQPassword: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client: Client = {
      id: `c${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      dateOfBirth: form.dateOfBirth,
      ssnLast4: form.ssnLast4,
      monthlyFee: Number(form.monthlyFee),
      referralSource: form.referralSource || undefined,
      myScoreIQUsername: form.myScoreIQUsername || undefined,
      myScoreIQPassword: form.myScoreIQPassword || undefined,
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

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">First Name *</label>
              <input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Last Name *</label>
              <input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </div>

          {/* Phone + SSN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone *</label>
              <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">SSN (Last 4)</label>
              <input maxLength={4} value={form.ssnLast4} onChange={e => set('ssnLast4', e.target.value)} placeholder="0000" className={inputCls} />
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date of Birth</label>
            <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls} />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <input maxLength={2} value={form.state} onChange={e => set('state', e.target.value)} placeholder="FL" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">ZIP</label>
              <input value={form.zip} onChange={e => set('zip', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Fee + Referral */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Monthly Fee ($)</label>
              <input type="number" value={form.monthlyFee} onChange={e => set('monthlyFee', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Referral Source</label>
              <input value={form.referralSource} onChange={e => set('referralSource', e.target.value)} placeholder="Facebook, Referral..." className={inputCls} />
            </div>
          </div>

          {/* MyScoreIQ Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">MyScoreIQ Login</span>
              <span className="text-xs text-gray-400">(optional — for report import)</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">MyScoreIQ Email / Username</label>
                <input
                  type="email"
                  value={form.myScoreIQUsername}
                  onChange={e => set('myScoreIQUsername', e.target.value)}
                  placeholder="client@email.com"
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">MyScoreIQ Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.myScoreIQPassword}
                    onChange={e => set('myScoreIQPassword', e.target.value)}
                    placeholder="••••••••"
                    className={`${inputCls} pr-10`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">SSN Last 4</label>
                <input
                  maxLength={4}
                  value={form.ssnLast4}
                  onChange={e => set('ssnLast4', e.target.value)}
                  placeholder="0000"
                  className={inputCls}
                />
              </div>
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
