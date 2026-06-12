import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { AlertCircle, Filter } from 'lucide-react';
import type { Bureau, DisputeStatus } from '../types';

const bureauColors: Record<Bureau, string> = {
  Equifax: 'bg-red-100 text-red-700 border-red-200',
  Experian: 'bg-blue-100 text-blue-700 border-blue-200',
  TransUnion: 'bg-green-100 text-green-700 border-green-200',
};

const statusColors: Record<DisputeStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  Investigating: 'bg-purple-100 text-purple-700',
  Verified: 'bg-red-100 text-red-700',
  Deleted: 'bg-green-100 text-green-700',
  Updated: 'bg-blue-100 text-blue-700',
};

export default function Disputes() {
  const { clients } = useStore();
  const [bureauFilter, setBureauFilter] = useState<Bureau | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'All'>('All');

  const allDisputes = clients.flatMap(c =>
    c.disputes.map(d => ({
      ...d,
      client: c,
      account: c.accounts.find(a => a.id === d.accountId),
    }))
  );

  const filtered = allDisputes.filter(d => {
    const matchBureau = bureauFilter === 'All' || d.bureau === bureauFilter;
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchBureau && matchStatus;
  }).sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime());

  const statusCounts = Object.fromEntries(
    (['Pending', 'In Progress', 'Investigating', 'Verified', 'Deleted', 'Updated'] as DisputeStatus[]).map(s => [
      s, allDisputes.filter(d => d.status === s).length
    ])
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="text-sm text-gray-500">{allDisputes.length} total disputes across all clients</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {(Object.entries(statusCounts) as [DisputeStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
            className={`p-3 rounded-xl border text-center transition-all ${statusFilter === status ? 'ring-2 ring-indigo-500' : ''} ${statusColors[status].replace('text-', 'border-').split(' ')[0]} bg-white border-gray-200`}
          >
            <div className="text-xl font-bold text-gray-900">{count}</div>
            <div className={`text-xs font-medium mt-0.5 ${statusColors[status].split(' ')[1]}`}>{status}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
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
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Bureau</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Reason</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Round</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Updated</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Letter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/clients/${d.clientId}`} className="font-medium text-sm text-gray-900 hover:text-indigo-600">
                    {d.client.firstName} {d.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.account?.creditor ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${bureauColors[d.bureau]}`}>{d.bureau}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{d.reason}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[d.status]}`}>{d.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">Round {d.round}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(d.dateUpdated), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  {d.letterSent
                    ? <span className="text-xs text-green-600">Sent {d.letterDate && format(new Date(d.letterDate), 'MMM d')}</span>
                    : <span className="text-xs text-gray-400">Not sent</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-2">
            <AlertCircle size={24} className="text-gray-300" />
            No disputes found
          </div>
        )}
      </div>
    </div>
  );
}
