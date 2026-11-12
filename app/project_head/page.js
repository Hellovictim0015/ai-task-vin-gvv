// app/ADMIN/page.jsx (Ya jahan bhi aapka main layout hai)
"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, CheckSquare, Folder, Sparkles, Calendar as CalendarIcon, 
  BarChart2, Users, Building2, UserCircle, ShieldCheck, Settings,
  Search, Bell, MoreVertical, Menu,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Projects from './components/Projects';

// Components Import


export default function AdminLayout() {
      const router = useRouter();
  // STATE TO TRACK ACTIVE TAB
  const [activeTab, setActiveTab] = useState('Dashboard');

  const handleLogout = () => {
    // 1. Clear LocalStorage
    localStorage.clear();

    // 2. Clear Cookies
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

    // 3. Redirect to Login
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex z-20">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm transform rotate-45"></div>
            </div>
            <span className="font-bold text-lg text-gray-900">TaskFlow <span className="text-blue-600">AI</span></span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <NavItem icon={CheckSquare} label="Tasks" active={activeTab === 'Tasks'} onClick={() => setActiveTab('Tasks')} />
          <NavItem icon={Folder} label="Projects" active={activeTab === 'Projects'} onClick={() => setActiveTab('Projects')} />
          <NavItem icon={Sparkles} label="AI Recommendations" active={activeTab === 'AI Recommendations'} onClick={() => setActiveTab('AI Recommendations')} />
          <NavItem icon={CalendarIcon} label="Calendar" active={activeTab === 'Calendar'} onClick={() => setActiveTab('Calendar')} />
          <NavItem icon={BarChart2} label="Reports" active={activeTab === 'Reports'} onClick={() => setActiveTab('Reports')} />
          <NavItem icon={Users} label="Teams" active={activeTab === 'Teams'} onClick={() => setActiveTab('Teams')} />
          <NavItem icon={Building2} label="Departments" active={activeTab === 'Departments'} onClick={() => setActiveTab('Departments')} />
          <NavItem icon={UserCircle} label="Members" active={activeTab === 'Members'} onClick={() => setActiveTab('Members')} />
          <NavItem icon={ShieldCheck} label="Roles & Permissions" active={activeTab === 'Roles & Permissions'} onClick={() => setActiveTab('Roles & Permissions')} />
          <NavItem icon={Settings} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>

        {/* User Profile Bottom */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Admin</p>
              <p className="text-xs text-blue-600 truncate">Super Admin</p>
            </div>
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500 hover:text-gray-700">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">{activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 lg:w-80"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
            </div>
            
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
            
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden hidden sm:block">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          
          {/* CONDITION 1: DASHBOARD */}
          {activeTab === 'Dashboard' && <Dashboard />}

          {/* CONDITION 2: TASKS */}
          {activeTab === 'Tasks' && <Tasks />}

          {/* CONDITION 3: PROJECTS */}
          {activeTab === 'Projects' && <Projects />}

          {/* FALLBACK FOR OTHER MENUS */}
          {activeTab !== 'Dashboard' && activeTab !== 'Tasks' && activeTab !== 'Projects' && (
            <div className="flex items-center justify-center h-full flex-col">
              <h1 className="text-4xl font-bold text-gray-800">{activeTab}</h1>
              <p className="text-gray-500 mt-2">Page Coming Soon...</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// Sidebar NavItem Component
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}