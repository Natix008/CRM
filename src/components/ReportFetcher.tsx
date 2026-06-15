import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Plus, X, Eye, EyeOff, Loader, ExternalLink, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import type { Client, FetchedReport, ReportAccount, Bureau } from '../types';

interface Props {
  client: Client;
}

const negativeStatusMap: Record<string, string> = {
  'Collection': 'Collection',
  'Charge-off': 'Charge-off',
  'Late Payment': 'Late Payment',
  'Repossession': 'Repossession',
  'Foreclosure': 'Foreclosure',
  'Bankruptcy': 'Bankruptcy',
  'Negative Item': 'Collection',
};

export default function ReportFetcher({ client }: Props) {
  const { addAccount, addDispute, refresh } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<FetchedReport | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [showCreds, setShowCreds] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [scoresSaved, setScoresSaved] = useState(false);

  const hasCredentials = !!(client.myScoreIQUsername && client.myScoreIQPassword);

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setScoresSaved(false);
    try {
      const result = await api.fetchReport(client.id);
      setReport(result);

      // Auto-save fetched scores to the client's credit profile
      if (result.scores && result.scores.length > 0) {
        const date = new Date().toISOString().split('T')[0];
        await Promise.all(
          result.scores.map((s: { bureau: string; score: number }) =>
            api.addScore(client.id, {
              id: `sc${Date.now()}-${s.bureau}`,
              clientId: client.id,
              bureau: s.bureau,
              score: s.score,
              date,
            })
          )
        );
        await refresh();
        setScoresSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (account: ReportAccount) => {
    const key = `${account.creditor}-${account.accountNumber}`;
    await addAccount(client.id, {
      id: `a${Date.now()}`,
      clientId: client.id,
      creditor: account.creditor,
      accountNumber: account.accountNumber,
      accountType: account.accountType as never,
      balance: account.balance,
      originalBalance: account.balance,
      dateOpened: account.dateOpened || new Date().toISOString().split('T')[0],
      status: (negativeStatusMap[account.negativeReason || ''] || account.status) as never,
      bureaus: account.bureaus as Bureau[],
    });
    setAdded(prev => new Set([...prev, key]));
  };

  const handleAddDispute = async (account: ReportAccount, bureau: Bureau) => {
    const key = `dispute-${account.creditor}-${bureau}`;
    const existingAccount = client.accounts.find(
      a => a.creditor.toLowerCase().includes(account.creditor.toLowerCase().slice(0, 8))
    );
    await addDispute(client.id, {
      id: `d${Date.now()}`,
      clientId: client.id,
      accountId: existingAccount?.id || '',
      bureau,
      reason: 'Inaccurate Information',
      status: 'Pending',
      round: 1,
      dateOpened: new Date().toISOString().split('T')[0],
      dateUpdated: new Date().toISOString().split('T')[0],
      letterSent: false,
    });
    setAdded(prev => new Set([...prev, key]));
  };

  const negatives = report?.accounts.filter(a => a.isNegative) ?? [];
  const positives = report?.accounts.filter(a => !a.isNegative) ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">MyScoreIQ Report</div>
            {report && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Calendar size={11} />
                Report date: {new Date(report.fetchedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCredentials && (
            <button
              onClick={() => setShowCreds(p => !p)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
            >
              {showCreds ? 'Hide credentials' : 'View credentials'}
            </button>
          )}
          <a
            href="https://member.myscoreiq.com/CreditReport.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1"
          >
            <ExternalLink size={12} /> View on MyScoreIQ
          </a>
          <button
            onClick={handleFetch}
            disabled={loading || !hasCredentials}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Fetching...' : 'Fetch Report'}
          </button>
        </div>
      </div>

      {/* No credentials warning */}
      {!hasCredentials && (
        <div className="px-5 py-4 text-sm text-amber-700 bg-amber-50 flex items-center gap-2">
          <AlertTriangle size={15} />
          No MyScoreIQ credentials saved for this client. Edit the client to add login info.
        </div>
      )}

      {/* Show credentials */}
      {showCreds && hasCredentials && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">Username:</span>
            <span className="font-mono text-gray-800">{client.myScoreIQUsername}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-20">Password:</span>
            <span className="font-mono text-gray-800">{showPassword ? client.myScoreIQPassword : '••••••••'}</span>
            <button onClick={() => setShowPassword(p => !p)} className="text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700 flex items-start gap-2">
          <X size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="px-5 py-8 text-center">
          <Loader size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
          <div className="text-sm text-gray-500">Logging into MyScoreIQ and extracting report...</div>
          <div className="text-xs text-gray-400 mt-1">This may take 30–60 seconds</div>
        </div>
      )}

      {/* Report Results */}
      {report && !loading && (
        <div className="p-5 space-y-5">

          {/* Scores saved notice */}
          {scoresSaved && (
            <div className="flex items-center gap-2 py-2.5 px-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              <CheckCircle size={15} />
              Credit scores saved to client profile — visible in the Credit Scores section above.
            </div>
          )}

          {/* Credit Scores from report */}
          {report.scores.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Scores from This Report</div>
              <div className="grid grid-cols-3 gap-3">
                {report.scores.map(s => {
                  const color = s.score >= 670 ? 'text-green-600' : s.score >= 580 ? 'text-yellow-600' : 'text-red-600';
                  const bg = s.bureau === 'Equifax' ? 'bg-red-50 border-red-100' : s.bureau === 'Experian' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100';
                  return (
                    <div key={s.bureau} className={`p-3 rounded-lg border text-center ${bg}`}>
                      <div className="text-xs text-gray-500 mb-1">{s.bureau}</div>
                      <div className={`text-2xl font-bold ${color}`}>{s.score}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Negative Items */}
          {negatives.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Negative Items ({negatives.length})
                </span>
              </div>
              <div className="space-y-2">
                {negatives.map((account, i) => {
                  const key = `${account.creditor}-${account.accountNumber}`;
                  const isAdded = added.has(key);
                  return (
                    <div key={i} className="border border-red-100 bg-red-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">{account.creditor}</span>
                            <span className="text-xs text-gray-500">{account.accountNumber}</span>
                            {account.negativeReason && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                {account.negativeReason}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Balance: <span className="font-semibold text-red-600">${account.balance.toLocaleString()}</span>
                            {' · '}Status: {account.status}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {account.bureaus.map(bureau => {
                              const dKey = `dispute-${account.creditor}-${bureau}`;
                              return (
                                <button
                                  key={bureau}
                                  onClick={() => handleAddDispute(account, bureau as Bureau)}
                                  disabled={added.has(dKey)}
                                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                    added.has(dKey)
                                      ? 'bg-green-100 text-green-700 border-green-200'
                                      : bureau === 'Equifax'
                                      ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                      : bureau === 'Experian'
                                      ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                      : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                  }`}
                                >
                                  {added.has(dKey) ? `✓ ${bureau}` : `+ Dispute ${bureau}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddAccount(account)}
                          disabled={isAdded}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                            isAdded ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {isAdded ? <CheckCircle size={12} /> : <Plus size={12} />}
                          {isAdded ? 'Added' : 'Add Account'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {negatives.length === 0 && (
            <div className="flex items-center gap-2 py-3 text-sm text-green-700 bg-green-50 rounded-lg px-4">
              <CheckCircle size={16} />
              No negative items detected on this report.
            </div>
          )}

          {/* Positive Accounts */}
          {positives.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Other Accounts ({positives.length})
              </div>
              <div className="space-y-1">
                {positives.map((account, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-xs">
                    <span className="text-gray-700 font-medium">{account.creditor}</span>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span>{account.status}</span>
                      <span className="font-semibold">${account.balance.toLocaleString()}</span>
                      <button
                        onClick={() => handleAddAccount(account)}
                        disabled={added.has(`${account.creditor}-${account.accountNumber}`)}
                        className="text-indigo-600 hover:underline disabled:text-gray-400"
                      >
                        {added.has(`${account.creditor}-${account.accountNumber}`) ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && hasCredentials && (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          Click <strong>Fetch Report</strong> to log into MyScoreIQ and pull this client's credit report.
        </div>
      )}
    </div>
  );
}
