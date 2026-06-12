import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1 relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients, disputes..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
            />
          </div>
          <button className="relative p-2 rounded-lg hover:bg-gray-100">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
