import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FileText, Plus, Printer, X } from 'lucide-react';
import type { Bureau, LetterType, Client } from '../types';

const bureauAddresses: Record<Bureau, { name: string; address: string; city: string }> = {
  Equifax: { name: 'Equifax Information Services LLC', address: 'P.O. Box 740256', city: 'Atlanta, GA 30374' },
  Experian: { name: 'Experian', address: 'P.O. Box 4500', city: 'Allen, TX 75013' },
  TransUnion: { name: 'TransUnion LLC', address: 'P.O. Box 2000', city: 'Chester, PA 19016' },
};

function generateLetterContent(client: Client, bureau: Bureau, type: LetterType, accounts: string[]): string {
  const today = format(new Date(), 'MMMM d, yyyy');
  const addr = bureauAddresses[bureau];

  const intro: Record<LetterType, string> = {
    'Standard Dispute': `I am writing to dispute the following information in my credit file. The items I dispute also are encircled on the attached copy of the report I received.`,
    'Debt Validation': `Pursuant to the Fair Debt Collection Practices Act, 15 USC 1692g, I hereby request that you provide me with validation of the debt(s) listed below.`,
    'Goodwill Letter': `I am writing to request a goodwill adjustment to remove the negative item(s) listed below from my credit report. I have been a responsible consumer and this entry does not reflect my creditworthiness.`,
    'Pay for Delete': `I am writing to propose a pay-for-delete agreement regarding the account(s) listed below. I am prepared to pay the balance in exchange for the complete removal of this account from all credit bureau reports.`,
    'Method of Verification': `Pursuant to the Fair Credit Reporting Act (FCRA) Section 611, I am requesting the Method of Verification used to verify the following disputed items on my credit report.`,
    'Cease and Desist': `This letter is to inform you that I am requesting that you immediately CEASE AND DESIST all attempts to collect on the debt(s) listed below.`,
  };

  const accountList = accounts.map((a, i) => `  ${i + 1}. ${a}`).join('\n');

  return `${today}

${addr.name}
${addr.address}
${addr.city}

Re: Credit File for ${client.firstName} ${client.lastName}
SSN: ***-**-${client.ssnLast4}
DOB: ${client.dateOfBirth}
Address: ${client.address}, ${client.city}, ${client.state} ${client.zip}

To Whom It May Concern:

${intro[type]}

The following account(s) are being disputed:

${accountList}

${type === 'Standard Dispute' ? `This information is inaccurate because the information reported does not belong to me and/or contains inaccurate information. I request that you investigate this matter and correct or delete the disputed items within 30 days, as required by the FCRA.

Please send me written confirmation of the results of your investigation and a free copy of my credit report if the investigation results in any change.` : ''}

${type === 'Debt Validation' ? `Please provide:
  1. Proof that you are licensed to collect debts in my state
  2. A copy of the original signed agreement
  3. Proof of the amount claimed to be owed
  4. A complete payment history

Until you can verify this debt, please cease all collection activities.` : ''}

Sincerely,

${client.firstName} ${client.lastName}

Enclosures: Copy of ID, Proof of Address`;
}

export default function Letters() {
  const { clients, addLetter } = useStore();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBureau, setSelectedBureau] = useState<Bureau>('Equifax');
  const [selectedType, setSelectedType] = useState<LetterType>('Standard Dispute');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const allLetters = clients.flatMap(c =>
    c.letters.map(l => ({ ...l, client: c }))
  ).sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  const handlePreview = () => {
    if (!selectedClient) return;
    const accountNames = selectedClient.accounts
      .filter(a => selectedAccounts.includes(a.id))
      .map(a => `${a.creditor} - ${a.accountNumber} (${a.status})`);
    setPreview(generateLetterContent(selectedClient, selectedBureau, selectedType, accountNames));
  };

  const handleSave = () => {
    if (!selectedClient || !preview) return;
    addLetter(selectedClient.id, {
      id: `l${Date.now()}`,
      clientId: selectedClient.id,
      disputeIds: [],
      type: selectedType,
      addressedTo: selectedBureau,
      dateCreated: new Date().toISOString().split('T')[0],
      dateSent: new Date().toISOString().split('T')[0],
      content: preview,
    });
    setShowGenerator(false);
    setPreview(null);
    setSelectedClientId('');
    setSelectedAccounts([]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letters</h1>
          <p className="text-sm text-gray-500">{allLetters.length} letters generated</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} />Generate Letter
        </button>
      </div>

      {/* Letters list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Client</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Addressed To</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allLetters.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-sm text-gray-900">{l.client.firstName} {l.client.lastName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700"><FileText size={13} />{l.type}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${l.addressedTo === 'Equifax' ? 'bg-red-100 text-red-700 border-red-200' : l.addressedTo === 'Experian' ? 'bg-blue-100 text-blue-700 border-blue-200' : l.addressedTo === 'TransUnion' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {l.addressedTo}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(l.dateCreated), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 text-xs text-green-600">{l.dateSent ? format(new Date(l.dateSent), 'MMM d, yyyy') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {allLetters.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No letters yet. Generate your first letter.</div>
        )}
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Generate Dispute Letter</h2>
              <button onClick={() => { setShowGenerator(false); setPreview(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-6">
              {!preview ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Client *</label>
                    <select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSelectedAccounts([]); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select a client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Bureau</label>
                      <select value={selectedBureau} onChange={e => setSelectedBureau(e.target.value as Bureau)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {(['Equifax', 'Experian', 'TransUnion'] as Bureau[]).map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Letter Type</label>
                      <select value={selectedType} onChange={e => setSelectedType(e.target.value as LetterType)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {(['Standard Dispute', 'Debt Validation', 'Goodwill Letter', 'Pay for Delete', 'Method of Verification', 'Cease and Desist'] as LetterType[]).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  {selectedClient && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">Accounts to Dispute</label>
                      <div className="space-y-2">
                        {selectedClient.accounts.map(account => (
                          <label key={account.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedAccounts.includes(account.id)}
                              onChange={e => setSelectedAccounts(prev => e.target.checked ? [...prev, account.id] : prev.filter(id => id !== account.id))}
                              className="accent-indigo-600"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-800">{account.creditor} — {account.accountNumber}</div>
                              <div className="text-xs text-gray-500">{account.accountType} · ${account.balance.toLocaleString()} · {account.status}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowGenerator(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={handlePreview} disabled={!selectedClientId || selectedAccounts.length === 0} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      Preview Letter
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4 font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {preview}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setPreview(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Back</button>
                    <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      <Printer size={15} />Print
                    </button>
                    <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">
                      Save & Mark Sent
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
