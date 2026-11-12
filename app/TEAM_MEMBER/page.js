"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, Folder, Sparkles, Calendar as CalendarIcon,
  BarChart2, Users, Building2, UserCircle, ShieldCheck, Settings,
  Search, Bell, MoreVertical, Menu, LogOut, X
} from 'lucide-react';

// Components Import
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Projects from './components/Projects';
import User from './components/User';
import Meeting from './components/Meeting';
import Eod from './components/Eod';
import Gen from './components/Gen';
import TeamsReport from './components/TeamsReport';
import Notifications from './components/Notifications';
import Settingss from './components/Settingss';

export default function AdminLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Menu State

  // LOGOUT FUNCTION
  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push('/login');
  };

  // RENDER MAIN CONTENT LOGIC
  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard />;
      case 'Tasks': return <Tasks />;
      case 'Projects': return <Projects />;
      case 'Roles & Permissions': return <User />;
      case 'meeting': return <Meeting />;
      case 'EOD': return <Eod />;
      case 'AI Recommendations': return <Gen />;
      case 'Teams': return <TeamsReport />;
      case 'Notifications': return <Notifications />;
      case 'Settings': return <Settingss />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{activeTab}</h1>
            <p className="text-gray-500 mt-2 font-medium">This module is coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              <div className="w-3.5 h-3.5 bg-white rounded-sm transform rotate-45"></div>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              TaskFlow <span className="text-blue-600">AI</span>
            </span>
          </div>
          {/* Close Button for Mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 custom-scrollbar">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 mt-2">Main Menu</p>
          {/* <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => { setActiveTab('Dashboard'); setIsSidebarOpen(false); }} /> */}
          {/* <NavItem icon={Folder} label="Projects" active={activeTab === 'Projects'} onClick={() => { setActiveTab('Projects'); setIsSidebarOpen(false); }} /> */}
          <NavItem icon={CheckSquare} label="Tasks" active={activeTab === 'Tasks'} onClick={() => { setActiveTab('Tasks'); setIsSidebarOpen(false); }} />
          <NavItem icon={CalendarIcon} label="Meeting" active={activeTab === 'meeting'} onClick={() => { setActiveTab('meeting'); setIsSidebarOpen(false); }} />
          <NavItem icon={BarChart2} label="EOD" active={activeTab === 'EOD'} onClick={() => { setActiveTab('EOD'); setIsSidebarOpen(false); }} />
          
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 mt-6">Insights & Management</p>
          {/* <NavItem icon={Sparkles} label="AI Recommendations" active={activeTab === 'AI Recommendations'} onClick={() => { setActiveTab('AI Recommendations'); setIsSidebarOpen(false); }} /> */}
          {/* <NavItem icon={Users} label="Teams Report" active={activeTab === 'Teams'} onClick={() => { setActiveTab('Teams'); setIsSidebarOpen(false); }} /> */}
          {/* <NavItem icon={ShieldCheck} label="Roles & Permissions" active={activeTab === 'Roles & Permissions'} onClick={() => { setActiveTab('Roles & Permissions'); setIsSidebarOpen(false); }} /> */}
          {/* <NavItem icon={Building2} label="Notifications" active={activeTab === 'Notifications'} onClick={() => { setActiveTab('Notifications'); setIsSidebarOpen(false); }} /> */}
          <NavItem icon={Settings} label="Settings" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false); }} />
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Logout Securely
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 capitalize tracking-tight">
              {activeTab.replace('meeting', 'Meetings')}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// NavItem Component with updated styling
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
        active 
          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
      {label}
    </button>
  );
}