import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Users, AlertCircle, FileText, TrendingUp, CheckCircle, Clock, XCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Bureau } from '../types';

const bureauColors: Record<Bureau, string> = {
  Equifax: 'bg-red-100 text-red-700 border-red-200',
  Experian: 'bg-blue-100 text-blue-700 border-blue-200',
  TransUnion: 'bg-green-100 text-green-700 border-green-200',
};

const statusColors: Record<string, string> = {
  Deleted: 'text-green-600',
  Updated: 'text-blue-600',
  Pending: 'text-yellow-600',
  'In Progress': 'text-indigo-600',
  Investigating: 'text-purple-600',
  Verified: 'text-red-600',
};

export default function Dashboard() {
  const { clients, tasks } = useStore();

  const allDisputes = clients.flatMap(c => c.disputes);
  const allLetters = clients.flatMap(c => c.letters);

  const activeClients = clients.filter(c => c.status === 'Active').length;
  const totalDisputes = allDisputes.length;
  const lettersSent = allLetters.filter(l => l.dateSent).length;
  const deletedDisputes = allDisputes.filter(d => d.status === 'Deleted').length;
  const successRate = totalDisputes > 0 ? Math.round((deletedDisputes / totalDisputes) * 100) : 0;

  const bureauStats: Record<Bureau, { total: number; deleted: number; inProgress: number }> = {
    Equifax: { total: 0, deleted: 0, inProgress: 0 },
    Experian: { total: 0, deleted: 0, inProgress: 0 },
    TransUnion: { total: 0, deleted: 0, inProgress: 0 },
  };
  allDisputes.forEach(d => {
    bureauStats[d.bureau].total++;
    if (d.status === 'Deleted') bureauStats[d.bureau].deleted++;
    if (d.status === 'In Progress' || d.status === 'Investigating') bureauStats[d.bureau].inProgress++;
  });

  const recentActivity = [...allDisputes]
    .sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime())
    .slice(0, 6)
    .map(d => {
      const client = clients.find(c => c.id === d.clientId);
      const account = client?.accounts.find(a => a.id === d.accountId);
      return { dispute: d, client, account };
    });

  const pendingTasks = [
    ...tasks.filter(t => t.status !== 'Done'),
    ...clients.flatMap(c => c.tasks.filter(t => t.status !== 'Done')),
  ].slice(0, 5);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Clients', value: activeClients, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Disputes', value: totalDisputes, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Letters Sent', value: lettersSent, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon size={20} className={s.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Bureau Stats */}
        {(Object.entries(bureauStats) as [Bureau, typeof bureauStats.Equifax][]).map(([bureau, stats]) => (
          <div key={bureau} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2 py-1 rounded border ${bureauColors[bureau]}`}>{bureau}</span>
              <span className="text-sm text-gray-500">{stats.total} disputes</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-green-600"><CheckCircle size={14} /> Deleted</span>
                <span className="font-semibold">{stats.deleted}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-indigo-600"><Clock size={14} /> In Progress</span>
                <span className="font-semibold">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-red-600"><XCircle size={14} /> Verified</span>
                <span className="font-semibold">{stats.total - stats.deleted - stats.inProgress}</span>
              </div>
              {stats.total > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Delete Rate</div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round((stats.deleted / stats.total) * 100)}%` }} />
                  </div>
                  <div className="text-xs font-medium text-gray-700 mt-1">{Math.round((stats.deleted / stats.total) * 100)}%</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Activity size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map(({ dispute, client, account }) => (
              <div key={dispute.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <Link to={`/clients/${dispute.clientId}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {client?.firstName} {client?.lastName}
                    </Link>
                    <span className="text-gray-500"> — {account?.creditor}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-medium ${statusColors[dispute.status] || 'text-gray-500'}`}>{dispute.status}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${bureauColors[dispute.bureau]}`}>{dispute.bureau}</span>
                    <span className="text-xs text-gray-400">{format(new Date(dispute.dateUpdated), 'MMM d')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-800">Upcoming Tasks</h2>
            </div>
            <Link to="/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.map(task => (
              <div key={task.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'High' ? 'bg-red-400' : task.priority === 'Medium' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{task.assignedTo}</span>
                    <span className="text-xs text-gray-400">Due {format(new Date(task.dueDate), 'MMM d')}</span>
                    <span className={`text-xs font-medium ${task.priority === 'High' ? 'text-red-600' : task.priority === 'Medium' ? 'text-yellow-600' : 'text-gray-500'}`}>{task.priority}</span>
                  </div>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">All tasks complete!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
