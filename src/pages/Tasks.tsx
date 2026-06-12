import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { CheckSquare, Plus, X, Check } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { Link } from 'react-router-dom';

const priorityColors: Record<TaskPriority, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-gray-100 text-gray-600',
};

const statusColors: Record<TaskStatus, string> = {
  Todo: 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
};

export default function Tasks() {
  const { clients, tasks, addTask, updateTask } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' as TaskPriority, dueDate: '', assignedTo: 'Agent Smith', clientId: '' });

  const allTasks = [
    ...tasks,
    ...clients.flatMap(c => c.tasks.map(t => ({ ...t, clientName: `${c.firstName} ${c.lastName}` }))),
  ] as (Task & { clientName?: string })[];

  const filtered = allTasks.filter(t => filter === 'All' || t.status === filter);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({ id: `t${Date.now()}`, ...form, status: 'Todo' });
    setShowAdd(false);
    setForm({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: 'Agent Smith', clientId: '' });
  };

  const toggleDone = (task: Task & { clientName?: string }) => {
    updateTask({ ...task, status: task.status === 'Done' ? 'Todo' : 'Done' });
  };

  const counts = {
    All: allTasks.length,
    Todo: allTasks.filter(t => t.status === 'Todo').length,
    'In Progress': allTasks.filter(t => t.status === 'In Progress').length,
    Done: allTasks.filter(t => t.status === 'Done').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{counts.Todo} pending, {counts['In Progress']} in progress</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} />Add Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['All', 'Todo', 'In Progress', 'Done'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s} <span className="ml-1 text-xs opacity-75">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => (
          <div key={task.id} className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 ${task.status === 'Done' ? 'opacity-60' : ''}`}>
            <button
              onClick={() => toggleDone(task)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${task.status === 'Done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500'}`}
            >
              {task.status === 'Done' && <Check size={12} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`font-medium text-sm ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>{task.status}</span>
              </div>
              {task.description && <div className="text-xs text-gray-500 mt-1">{task.description}</div>}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span>{task.assignedTo}</span>
                {task.dueDate && <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
                {(task as any).clientName && (
                  <Link to={`/clients/${task.clientId}`} className="text-indigo-500 hover:underline">
                    {(task as any).clientName}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
            <CheckSquare size={32} className="text-gray-200" />
            <span className="text-sm">No tasks found</span>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Add Task</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Assigned To</label>
                  <input value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Client (optional)</label>
                  <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
