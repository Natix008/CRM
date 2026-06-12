import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { CreditCard, Filter } from 'lucide-react';
import type { AccountStatus, Bureau } from '../types';

const statusColors: Record<AccountStatus, string> = {
  Collection: 'bg-red-100 text-red-700',
  'Charge-off': 'bg-orange-100 text-orange-700',
  'Late Payment': 'bg-yellow-100 text-yellow-700',
  Repossession: 'bg-red-100 text-red-700',
  Bankruptcy: 'bg-gray-200 text-gray-700',
  Foreclosure: 'bg-red-100 text-red-700',
  Current: 'bg-green-100 text-green-700',
  Paid: 'bg-green-100 text-green-700',
};

const bureauColors: Record<Bureau, string> = {
  Equifax: 'bg-red-100 text-red-700 border-red-200',
  Experian: 'bg-blue-100 text-blue-700 border-blue-200',
  TransUnion: 'bg-green-100 text-green-700 border-green-200',
};

export default function Accounts() {
  const { clients } = useStore();
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'All'>('All');
  const [bureauFilter, setBureauFilter] = useState<Bureau | 'All'>('All');

  const allAccounts = clients.flatMap(c =>
    c.accounts.map(a => ({ ...a, client: c }))
  );

  const filtered = allAccounts.filter(a => {
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchBureau = bureauFilter === 'All' || a.bureaus.includes(bureauFilter as Bureau);
    return matchStatus && matchBureau;
  });

  const totalBalance = filtered.reduce((sum, a) => sum + a.balance, 0);

  const statusCounts = (['Collection', 'Charge-off', 'Late Payment', 'Repossession', 'Paid', 'Current'] as AccountStatus[]).map(s => ({
    status: s,
    count: allAccounts.filter(a => a.status === s).length,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounts & Tradelines</h1>
        <p className="text-sm text-gray-500">{allAccounts.length} total accounts · ${totalBalance.toLocaleString()} total balance</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {statusCounts.map(({ status, count }) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
            className={`p-3 bg-white border rounded-xl text-center transition-all ${statusFilter === status ? 'ring-2 ring-indigo-500 border-indigo-300' : 'border-gray-200'}`}
          >
            <div className="text-xl font-bold text-gray-900">{count}</div>
            <div className={`text-xs font-medium mt-0.5 ${statusColors[status].split(' ')[1]}`}>{status}</div>
          </button>
        ))}
      </div>

      {/* Bureau filter */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1">
          <Filter size={14} className="text-gray-400 ml-2 mr-1" />
          {(['All', 'Equifax', 'Experian', 'TransUnion'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBureauFilter(b)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${bureauFilter === b ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Client</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Creditor</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Balance</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Bureaus</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/clients/${a.clientId}`} className="font-medium text-sm text-gray-900 hover:text-indigo-600">
                    {a.client.firstName} {a.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CreditCard size={14} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{a.creditor}</div>
                      <div className="text-xs text-gray-400">{a.accountNumber}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{a.accountType}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[a.status]}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-bold text-red-600">${a.balance.toLocaleString()}</div>
                  {a.originalBalance !== a.balance && <div className="text-xs text-gray-400">Orig: ${a.originalBalance.toLocaleString()}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.bureaus.map(b => (
                      <span key={b} className={`text-xs px-1.5 py-0.5 rounded border ${bureauColors[b]}`}>{b.slice(0, 2)}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(a.dateOpened), 'MMM yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No accounts match the filter.</div>
        )}
      </div>
    </div>
  );
}
