import { useState, useEffect, createContext, useContext } from 'react';
import type { Client, Dispute, Task, Account, Letter, Note } from '../types';
import { api } from '../lib/api';

interface StoreState {
  clients: Client[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  addDispute: (clientId: string, dispute: Dispute) => Promise<void>;
  updateDispute: (clientId: string, dispute: Dispute) => Promise<void>;
  addAccount: (clientId: string, account: Account) => Promise<void>;
  addNote: (clientId: string, note: Note) => Promise<void>;
  addLetter: (clientId: string, letter: Letter) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStoreState(): StoreState {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      const [clientsData, tasksData] = await Promise.all([api.getClients(), api.getTasks()]);
      setClients(clientsData);
      setTasks(tasksData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const addClient = async (client: Client) => {
    const saved = await api.addClient(client);
    setClients(prev => [saved, ...prev]);
  };

  const updateClient = async (client: Client) => {
    await api.updateClient(client.id, client);
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
  };

  const addDispute = async (clientId: string, dispute: Dispute) => {
    await api.addDispute(clientId, dispute);
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, disputes: [...c.disputes, dispute] } : c
    ));
  };

  const updateDispute = async (clientId: string, dispute: Dispute) => {
    await api.updateDispute(dispute.id, dispute);
    setClients(prev => prev.map(c =>
      c.id === clientId
        ? { ...c, disputes: c.disputes.map(d => d.id === dispute.id ? dispute : d) }
        : c
    ));
  };

  const addAccount = async (clientId: string, account: Account) => {
    await api.addAccount(clientId, account);
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, accounts: [...c.accounts, account] } : c
    ));
  };

  const addNote = async (clientId: string, note: Note) => {
    await api.addNote(clientId, note);
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, notes: [...c.notes, note] } : c
    ));
  };

  const addLetter = async (clientId: string, letter: Letter) => {
    await api.addLetter(clientId, letter);
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, letters: [...c.letters, letter] } : c
    ));
  };

  const addTask = async (task: Task) => {
    await api.addTask(task);
    if (task.clientId) {
      setClients(prev => prev.map(c =>
        c.id === task.clientId ? { ...c, tasks: [...c.tasks, task] } : c
      ));
    } else {
      setTasks(prev => [...prev, task]);
    }
  };

  const updateTask = async (task: Task) => {
    await api.updateTask(task.id, task);
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    setClients(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map(t => t.id === task.id ? task : t),
    })));
  };

  return {
    clients, tasks, loading, error,
    addClient, updateClient,
    addDispute, updateDispute,
    addAccount, addNote, addLetter,
    addTask, updateTask,
    refresh: fetchAll,
  };
}

export const StoreContext = createContext<StoreState | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
