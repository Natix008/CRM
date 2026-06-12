import { useState } from 'react';
import { Save, Building2, Users, FileText, Bell } from 'lucide-react';

export default function Settings() {
  const [company, setCompany] = useState({
    name: 'CreditPro Solutions',
    email: 'support@creditpro.com',
    phone: '(800) 555-0100',
    address: '100 Financial Plaza, Suite 500',
    city: 'Miami',
    state: 'FL',
    zip: '33131',
    website: 'www.creditpro.com',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your company info and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Company Info */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Building2 size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Company Information</h2>
          </div>
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Company Name</label>
                <input value={company.name} onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                <input type="email" value={company.email} onChange={e => setCompany(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
                <input value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
                <input value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
                <input value={company.city} onChange={e => setCompany(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
                  <input value={company.state} maxLength={2} onChange={e => setCompany(p => ({ ...p, state: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">ZIP</label>
                  <input value={company.zip} onChange={e => setCompany(p => ({ ...p, zip: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Website</label>
                <input value={company.website} onChange={e => setCompany(p => ({ ...p, website: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <button type="submit" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              <Save size={15} />{saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Agents */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Users size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Agents</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { name: 'Agent Smith', role: 'Admin', email: 'smith@creditpro.com', initials: 'AS' },
              { name: 'Agent Davis', role: 'Credit Specialist', email: 'davis@creditpro.com', initials: 'AD' },
            ].map(agent => (
              <div key={agent.name} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">{agent.initials}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.email}</div>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{agent.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Letter Templates */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <FileText size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Letter Templates</h2>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {['Standard Dispute', 'Debt Validation', 'Goodwill Letter', 'Pay for Delete', 'Method of Verification', 'Cease and Desist'].map(t => (
                <div key={t} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <span className="text-sm text-gray-800">{t}</span>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Bell size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Notifications</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              'Dispute status updates',
              'Task due date reminders',
              'New client enrollment',
              'Monthly report summary',
            ].map(n => (
              <label key={n} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">{n}</span>
                <div className="relative">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-checked:bg-indigo-600 rounded-full transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
