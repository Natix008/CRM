import { useState, createContext, useContext } from 'react';
import type { Client, Dispute, Task, Account, Letter, Note } from '../types';
import { mockClients, globalTasks } from '../data/mockData';

interface StoreState {
  clients: Client[];
  tasks: Task[];
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  addDispute: (clientId: string, dispute: Dispute) => void;
  updateDispute: (clientId: string, dispute: Dispute) => void;
  addAccount: (clientId: string, account: Account) => void;
  addNote: (clientId: string, note: Note) => void;
  addLetter: (clientId: string, letter: Letter) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
}

export function useStoreState(): StoreState {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [tasks, setTasks] = useState<Task[]>(globalTasks);

  const addClient = (client: Client) => setClients(prev => [client, ...prev]);

  const updateClient = (client: Client) =>
    setClients(prev => prev.map(c => c.id === client.id ? client : c));

  const addDispute = (clientId: string, dispute: Dispute) =>
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, disputes: [...c.disputes, dispute] } : c
    ));

  const updateDispute = (clientId: string, dispute: Dispute) =>
    setClients(prev => prev.map(c =>
      c.id === clientId
        ? { ...c, disputes: c.disputes.map(d => d.id === dispute.id ? dispute : d) }
        : c
    ));

  const addAccount = (clientId: string, account: Account) =>
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, accounts: [...c.accounts, account] } : c
    ));

  const addNote = (clientId: string, note: Note) =>
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, notes: [...c.notes, note] } : c
    ));

  const addLetter = (clientId: string, letter: Letter) =>
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, letters: [...c.letters, letter] } : c
    ));

  const addTask = (task: Task) => {
    if (task.clientId) {
      setClients(prev => prev.map(c =>
        c.id === task.clientId ? { ...c, tasks: [...c.tasks, task] } : c
      ));
    } else {
      setTasks(prev => [...prev, task]);
    }
  };

  const updateTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    setClients(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map(t => t.id === task.id ? task : t)
    })));
  };

  return { clients, tasks, addClient, updateClient, addDispute, updateDispute, addAccount, addNote, addLetter, addTask, updateTask };
}

export const StoreContext = createContext<StoreState | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
