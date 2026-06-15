export type Bureau = 'Equifax' | 'Experian' | 'TransUnion';

export type DisputeStatus = 'Pending' | 'In Progress' | 'Verified' | 'Deleted' | 'Updated' | 'Investigating';

export type AccountStatus = 'Collection' | 'Charge-off' | 'Late Payment' | 'Repossession' | 'Bankruptcy' | 'Foreclosure' | 'Current' | 'Paid';

export type AccountType = 'Credit Card' | 'Auto Loan' | 'Mortgage' | 'Student Loan' | 'Personal Loan' | 'Medical' | 'Utility' | 'Cell Phone' | 'Other';

export type DisputeReason =
  | 'Not Mine'
  | 'Inaccurate Information'
  | 'Duplicate Account'
  | 'Outdated Information'
  | 'Account Paid'
  | 'Incorrect Balance'
  | 'Incorrect Status'
  | 'Identity Theft';

export type LetterType = 'Standard Dispute' | 'Debt Validation' | 'Goodwill Letter' | 'Pay for Delete' | 'Method of Verification' | 'Cease and Desist';

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface CreditScore {
  bureau: Bureau;
  score: number;
  date: string;
}

export interface Account {
  id: string;
  clientId: string;
  creditor: string;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  originalBalance: number;
  dateOpened: string;
  dateClosed?: string;
  status: AccountStatus;
  bureaus: Bureau[];
  notes?: string;
}

export interface Dispute {
  id: string;
  clientId: string;
  accountId: string;
  bureau: Bureau;
  reason: DisputeReason;
  status: DisputeStatus;
  round: number;
  dateOpened: string;
  dateUpdated: string;
  notes?: string;
  letterSent?: boolean;
  letterDate?: string;
  result?: string;
}

export interface Letter {
  id: string;
  clientId: string;
  disputeIds: string[];
  type: LetterType;
  addressedTo: Bureau | 'Creditor';
  creditorName?: string;
  dateCreated: string;
  dateSent?: string;
  content?: string;
}

export interface Note {
  id: string;
  clientId: string;
  content: string;
  date: string;
  author: string;
}

export interface Task {
  id: string;
  clientId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dateOfBirth: string;
  ssnLast4: string;
  enrollmentDate: string;
  status: 'Active' | 'Inactive' | 'Completed';
  creditScores: CreditScore[];
  accounts: Account[];
  disputes: Dispute[];
  letters: Letter[];
  notes: Note[];
  tasks: Task[];
  referralSource?: string;
  monthlyFee: number;
  myScoreIQUsername?: string;
  myScoreIQPassword?: string;
}

export interface ReportAccount {
  creditor: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  status: string;
  bureaus: Bureau[];
  dateOpened?: string;
  isNegative: boolean;
  negativeReason?: string;
}

export interface FetchedReport {
  clientId: string;
  fetchedAt: string;
  scores: { bureau: Bureau; score: number }[];
  accounts: ReportAccount[];
  negativeCount: number;
}
