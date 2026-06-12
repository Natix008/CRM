import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Plus, Search, Filter, Phone, Mail, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Client } from '../types';
import AddClientModal from '../components/AddClientModal';

const statusBadge: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Completed: 'bg-blue-100 text-blue-700',
};

function getLatestScore(client: Client, bureau: 'Equifax' | 'Experian' | 'TransUnion') {
  const scores = client.creditScores.filter(s => s.bureau === bureau).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return scores[0]?.score;
}

function getScoreDelta(client: Client, bureau: 'Equifax' | 'Experian' | 'TransUnion') {
  const scores = client.creditScores.filter(s => s.bureau === bureau).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (scores.length < 2) return null;
  return scores[0].score - scores[scores.length - 1].score;
}

export default function Clients() {
  const { clients } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = clients.filter(c => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || c.email.includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{clients.length} total clients</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1">
          <Filter size={14} className="text-gray-400 ml-2 mr-1" />
          {['All', 'Active', 'Inactive', 'Completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {s}
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
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Contact</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">EQ Score</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">EX Score</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">TU Score</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Disputes</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(client => {
              const eqScore = getLatestScore(client, 'Equifax');
              const exScore = getLatestScore(client, 'Experian');
              const tuScore = getLatestScore(client, 'TransUnion');
              const eqDelta = getScoreDelta(client, 'Equifax');
              const activeDisputes = client.disputes.filter(d => d.status !== 'Deleted' && d.status !== 'Verified').length;
              return (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/clients/${client.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 hover:text-indigo-600 text-sm">{client.firstName} {client.lastName}</div>
                        <div className="text-xs text-gray-400">{client.city}, {client.state}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-600"><Phone size={11} />{client.phone}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400"><Mail size={11} />{client.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[client.status]}`}>{client.status}</span>
                  </td>
                  {[eqScore, exScore, tuScore].map((score, i) => {
                    const delta = i === 0 ? eqDelta : null;
                    const scoreColor = score && score >= 670 ? 'text-green-600' : score && score >= 580 ? 'text-yellow-600' : 'text-red-600';
                    return (
                      <td key={i} className="px-4 py-3">
                        <div className={`text-sm font-bold ${scoreColor}`}>{score ?? '—'}</div>
                        {delta !== null && (
                          <div className={`flex items-center gap-0.5 text-xs ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {delta > 0 ? '+' : ''}{delta}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{client.disputes.length}</span>
                    {activeDisputes > 0 && (
                      <span className="ml-1 text-xs text-indigo-600">({activeDisputes} active)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(client.enrollmentDate), 'MMM d, yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
        )}
      </div>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
