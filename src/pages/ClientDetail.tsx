import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import {
  ArrowLeft, Phone, Mail, MapPin, TrendingUp, TrendingDown,
  Plus, CheckCircle, AlertCircle, Clock, CreditCard, FileText, StickyNote
} from 'lucide-react';
import type { Bureau, DisputeStatus } from '../types';

const bureauColors: Record<Bureau, string> = {
  Equifax: 'bg-red-100 text-red-700 border-red-200',
  Experian: 'bg-blue-100 text-blue-700 border-blue-200',
  TransUnion: 'bg-green-100 text-green-700 border-green-200',
};

const disputeStatusColors: Record<DisputeStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  Investigating: 'bg-purple-100 text-purple-700',
  Verified: 'bg-red-100 text-red-700',
  Deleted: 'bg-green-100 text-green-700',
  Updated: 'bg-blue-100 text-blue-700',
};

const accountStatusColors: Record<string, string> = {
  Collection: 'bg-red-100 text-red-700',
  'Charge-off': 'bg-orange-100 text-orange-700',
  'Late Payment': 'bg-yellow-100 text-yellow-700',
  Repossession: 'bg-red-100 text-red-700',
  Bankruptcy: 'bg-gray-200 text-gray-700',
  Foreclosure: 'bg-red-100 text-red-700',
  Current: 'bg-green-100 text-green-700',
  Paid: 'bg-green-100 text-green-700',
};

type Tab = 'overview' | 'accounts' | 'disputes' | 'letters' | 'notes';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { clients, addNote } = useStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [newNote, setNewNote] = useState('');

  const client = clients.find(c => c.id === id);
  if (!client) return <div className="p-8 text-gray-500">Client not found.</div>;

  const latestScores = (['Equifax', 'Experian', 'TransUnion'] as Bureau[]).map(bureau => {
    const scores = client.creditScores.filter(s => s.bureau === bureau).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = scores[0];
    const first = scores[scores.length - 1];
    const delta = latest && first && scores.length > 1 ? latest.score - first.score : null;
    return { bureau, score: latest?.score, delta, date: latest?.date };
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote(client.id, {
      id: `n${Date.now()}`,
      clientId: client.id,
      content: newNote,
      date: new Date().toISOString(),
      author: 'Agent Smith',
    });
    setNewNote('');
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'accounts', label: `Accounts (${client.accounts.length})`, icon: CreditCard },
    { key: 'disputes', label: `Disputes (${client.disputes.length})`, icon: AlertCircle },
    { key: 'letters', label: `Letters (${client.letters.length})`, icon: FileText },
    { key: 'notes', label: `Notes (${client.notes.length})`, icon: StickyNote },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={15} /> Back to Clients
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
            {client.firstName[0]}{client.lastName[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.firstName} {client.lastName}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${client.status === 'Active' ? 'bg-green-100 text-green-700' : client.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {client.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Phone size={13} />{client.phone}</span>
              <span className="flex items-center gap-1"><Mail size={13} />{client.email}</span>
              <span className="flex items-center gap-1"><MapPin size={13} />{client.city}, {client.state}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Monthly Fee</div>
            <div className="text-lg font-bold text-gray-900">${client.monthlyFee}/mo</div>
            <div className="text-xs text-gray-400">Since {format(new Date(client.enrollmentDate), 'MMM d, yyyy')}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Credit Scores */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Credit Scores</h2>
            <div className="grid grid-cols-3 gap-4">
              {latestScores.map(({ bureau, score, delta, date }) => {
                const color = score && score >= 670 ? 'text-green-600' : score && score >= 580 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <div key={bureau} className={`p-4 rounded-lg border ${bureau === 'Equifax' ? 'border-red-100 bg-red-50' : bureau === 'Experian' ? 'border-blue-100 bg-blue-50' : 'border-green-100 bg-green-50'}`}>
                    <div className={`text-xs font-semibold mb-2 ${bureauColors[bureau as Bureau].split(' ')[1]}`}>{bureau}</div>
                    <div className={`text-3xl font-bold ${color}`}>{score ?? 'N/A'}</div>
                    {delta !== null && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {delta > 0 ? '+' : ''}{delta} pts total
                      </div>
                    )}
                    {date && <div className="text-xs text-gray-400 mt-1">Updated {format(new Date(date), 'MMM d, yyyy')}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ['Full Name', `${client.firstName} ${client.lastName}`],
                ['Date of Birth', client.dateOfBirth ? format(new Date(client.dateOfBirth), 'MMMM d, yyyy') : '—'],
                ['SSN (Last 4)', `***-**-${client.ssnLast4}`],
                ['Email', client.email],
                ['Phone', client.phone],
                ['Address', `${client.address}, ${client.city}, ${client.state} ${client.zip}`],
                ['Referral Source', client.referralSource || '—'],
                ['Enrolled', format(new Date(client.enrollmentDate), 'MMMM d, yyyy')],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className="text-gray-800 font-medium mt-0.5">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dispute Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Dispute Summary</h2>
            <div className="grid grid-cols-4 gap-3">
              {(['Pending', 'In Progress', 'Deleted', 'Verified'] as DisputeStatus[]).map(status => (
                <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{client.disputes.filter(d => d.status === status).length}</div>
                  <div className={`text-xs font-medium mt-1 ${disputeStatusColors[status].split(' ')[1]}`}>{status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {tab === 'accounts' && (
        <div className="space-y-3">
          {client.accounts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No accounts yet.</div>}
          {client.accounts.map(account => (
            <div key={account.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-gray-900">{account.creditor}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${accountStatusColors[account.status]}`}>{account.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">{account.accountType} · {account.accountNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">${account.balance.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Original: ${account.originalBalance.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                {account.bureaus.map(b => (
                  <span key={b} className={`text-xs px-2 py-0.5 rounded border ${bureauColors[b]}`}>{b}</span>
                ))}
                <span className="text-xs text-gray-400 ml-auto">Opened: {format(new Date(account.dateOpened), 'MMM yyyy')}{account.dateClosed && ` · Closed: ${format(new Date(account.dateClosed), 'MMM yyyy')}`}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disputes Tab */}
      {tab === 'disputes' && (
        <div className="space-y-3">
          {client.disputes.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No disputes yet.</div>}
          {client.disputes.map(dispute => {
            const account = client.accounts.find(a => a.id === dispute.accountId);
            return (
              <div key={dispute.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${disputeStatusColors[dispute.status]}`}>{dispute.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${bureauColors[dispute.bureau]}`}>{dispute.bureau}</span>
                      <span className="text-xs text-gray-500">Round {dispute.round}</span>
                    </div>
                    <div className="font-medium text-gray-900">{account?.creditor}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Reason: {dispute.reason}</div>
                    {dispute.result && <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1"><CheckCircle size={12} />{dispute.result}</div>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>Opened {format(new Date(dispute.dateOpened), 'MMM d, yyyy')}</div>
                    <div>Updated {format(new Date(dispute.dateUpdated), 'MMM d, yyyy')}</div>
                    {dispute.letterSent && <div className="text-indigo-600 mt-1 flex items-center gap-1 justify-end"><FileText size={11} />Letter sent</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Letters Tab */}
      {tab === 'letters' && (
        <div className="space-y-3">
          {client.letters.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No letters generated yet.</div>}
          {client.letters.map(letter => (
            <div key={letter.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{letter.type}</div>
                <div className="text-xs text-gray-500 mt-0.5">To: {letter.addressedTo} · Created {format(new Date(letter.dateCreated), 'MMM d, yyyy')}</div>
              </div>
              {letter.dateSent
                ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={13} />Sent {format(new Date(letter.dateSent), 'MMM d')}</span>
                : <span className="text-xs text-yellow-600 flex items-center gap-1"><Clock size={13} />Not sent</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button onClick={handleAddNote} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                <Plus size={14} />Add Note
              </button>
            </div>
          </div>
          {[...client.notes].reverse().map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm text-gray-800">{note.content}</div>
              <div className="text-xs text-gray-400 mt-2">{note.author} · {format(new Date(note.date), 'MMM d, yyyy')}</div>
            </div>
          ))}
          {client.notes.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No notes yet.</div>}
        </div>
      )}
    </div>
  );
}
