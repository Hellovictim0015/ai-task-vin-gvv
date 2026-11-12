"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, Clock, Users, ChevronDown, Search, 
  Filter, Plus, Eye, MoreVertical, Send, LayoutList, CalendarDays,
  LineChart, ChevronLeft, ChevronRight, RefreshCw, List, UserX, User
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]); // NEW: State to store projects
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('ALL_TIME'); // 'ALL_TIME' | 'TODAY' | 'CALENDAR' | 'MY_EOD' | 'NON_SUBMITTERS'
  
  // Submit EOD Form states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultEodForm = {
    project_id: '', completed_work: '', pending_work: '', delay_reason: '', tomorrow_plan: '', support_required: ''
  };
  const [eodForm, setEodForm] = useState(defaultEodForm);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("2026-05-26");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // --- HELPER: FORMAT EOD ITEM BASED ON NEW API RESPONSE ---
  const formatEodItem = (item, prefix) => ({
    id: `${prefix}_${item.id}`,
    rawDate: item.report_date,
    name: item.user?.name || `User #${item.user_id}`,
    role: item.user?.role?.replace(/_/g, ' ') || 'Team Member',
    // FIXED: Safely handle department as object or string
    dept: item.user?.department?.name || (typeof item.user?.department === 'string' ? item.user.department : '—'),
    projectName: item.project?.name || `Project #${item.project_id}`,
    date: new Date(item.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Submitted',
    progress: item.pending_work ? 50 : (!item.completed_work ? 0 : 100),
    time: new Date(item.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    avatar: item.user?.name ? item.user.name.substring(0, 2).toUpperCase() : `U${item.user_id}`
  });

  // --- NEW: FETCH PROJECTS ---
  const fetchProjects = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/projects/`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  // --- 1. FETCH ALL EODs ---
  const fetchAllReports = async () => {
    try {
      setIsLoading(true); setViewMode('ALL_TIME'); setActiveTab('ALL');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/eod`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      const formattedData = data.map(item => formatEodItem(item, 'all'));
      setReports(formattedData);
      setSummaryData({ date: null, total_members: new Set(data.map(d => d.user_id)).size, submitted_count: data.length, not_submitted_count: 0 });
    } catch (err) { console.error("Error:", err); } finally { setIsLoading(false); }
  };

  // --- 2. FETCH TODAY'S SUMMARY ---
  const fetchDailySummary = async () => {
    try {
      setIsRefreshing(true); setViewMode('TODAY'); setActiveTab('ALL');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/eod/daily-summary`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setSummaryData(data);

      const submitted = (data.submitted_reports || []).map(item => formatEodItem(item, 'sub'));

      const pending = (data.not_submitted_members || []).map(user => ({
        id: `pend_${user.user_id}`, rawDate: data.date,
        name: user.name || `User #${user.user_id}`, 
        role: user.role?.replace(/_/g, ' ') || '—', 
        // FIXED: Safely handle department as object or string
        dept: user.department?.name || (typeof user.department === 'string' ? user.department : '—'),
        projectName: '—',
        date: new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Pending', progress: 0, time: '—', 
        avatar: user.name ? user.name.substring(0, 2).toUpperCase() : `U${user.user_id}`
      }));
      setReports([...submitted, ...pending]);
    } catch (err) { console.error("Error:", err); } finally { setIsRefreshing(false); setIsLoading(false); }
  };

  // --- 3. FETCH NON-SUBMITTERS API ---
  const fetchNonSubmitters = async () => {
    try {
      setIsLoading(true); setViewMode('NON_SUBMITTERS'); setActiveTab('PENDING');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/eod/non-submitters`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json(); 

      const pending = (Array.isArray(data) ? data : []).map(user => ({
        id: `pend_${user.user_id || user.id || Math.random()}`,
        rawDate: new Date().toISOString().split('T')[0],
        name: user.name || `User #${user.user_id || user.id}`,
        role: user.role?.replace(/_/g, ' ') || '—', 
        // FIXED: Safely handle department as object or string
        dept: user.department?.name || (typeof user.department === 'string' ? user.department : '—'),
        projectName: '—',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Pending', progress: 0, time: '—',
        avatar: user.name ? user.name.substring(0, 2).toUpperCase() : 'U'
      }));

      setReports(pending);
      setSummaryData({ date: new Date().toISOString(), total_members: pending.length, submitted_count: 0, not_submitted_count: pending.length });
    } catch (err) { console.error("Error:", err); } finally { setIsLoading(false); }
  };

  // --- 4. FETCH MY REPORTS ---
  const fetchMyReports = async () => {
    try {
      setIsLoading(true); setViewMode('MY_EOD'); setActiveTab('ALL');
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/eod/my-reports`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      const formattedData = data.map(item => formatEodItem(item, 'my'));
      setReports(formattedData);
      setSummaryData({ date: null, total_members: 1, submitted_count: data.length, not_submitted_count: 0 });
    } catch (err) { console.error("Error:", err); } finally { setIsLoading(false); }
  };

  // --- 5. SUBMIT EOD FORM HANDLER ---
  const handleSubmitEOD = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const payload = { ...eodForm, project_id: eodForm.project_id ? parseInt(eodForm.project_id) : 1 };

      const response = await fetch(`${BASE_URL}/eod/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit EOD');
      setIsSubmitModalOpen(false); setEodForm(defaultEodForm);
      if (viewMode === 'TODAY') fetchDailySummary(); else fetchMyReports();
    } catch (err) { alert("Error submitting EOD: " + err.message); } finally { setIsSubmitting(false); }
  };

  useEffect(() => { 
    fetchAllReports(); 
    fetchProjects(); // Load projects on mount
  }, []);

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const calendarCells = Array(getFirstDayOfMonth(currentYear, currentMonth)).fill(null).concat(Array.from({length: getDaysInMonth(currentYear, currentMonth)}, (_, i) => i + 1));
  
  const getEODsCountForDate = (day) => {
    if (!day) return 0;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reports.filter(r => r.rawDate === dateStr && r.status === 'Submitted').length;
  };

  const displayedReports = reports.filter(report => {
    if (viewMode === 'CALENDAR' && report.rawDate !== selectedCalendarDate) return false;
    if (activeTab === 'SUBMITTED') return report.status === 'Submitted';
    if (activeTab === 'PENDING') return report.status === 'Pending';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-6 font-sans text-gray-900 relative">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">End of Day Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Track daily progress, accomplishments, and blockers.</p>
          </div>
          
          {/* API TOGGLE BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
            <button onClick={fetchAllReports} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'ALL_TIME' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
              <List size={16} /> History
            </button>
            <button onClick={fetchDailySummary} disabled={isRefreshing} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'TODAY' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}>
              <RefreshCw size={16} className={isRefreshing && viewMode === 'TODAY' ? "animate-spin" : ""} /> Today
            </button>
            <button onClick={fetchNonSubmitters} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'NON_SUBMITTERS' ? 'bg-orange-500 text-white shadow-md' : 'text-orange-600 hover:bg-orange-50'}`}>
              <UserX size={16} /> Non-Submitters
            </button>
            {/* NEW ADDED BUTTON: My EOD */}
            <button onClick={fetchMyReports} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'MY_EOD' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}>
              <User size={16} /> My EOD
            </button>
            <button onClick={() => { setViewMode('CALENDAR'); setActiveTab('ALL'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'CALENDAR' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}>
              <CalendarDays size={16} /> Calendar
            </button>
          </div>
        </div>

        {/* DYNAMIC STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
            <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600"><Users size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">{viewMode === 'TODAY' ? 'Total Members' : viewMode === 'MY_EOD' ? 'My Account' : viewMode === 'NON_SUBMITTERS' ? 'Defaulters' : 'Unique Users'}</p>
              <h3 className="text-2xl font-bold text-gray-900">{summaryData?.total_members || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
            <div className="p-3.5 rounded-xl bg-green-50 text-green-600"><CheckCircle size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Submitted EODs</p>
              <h3 className="text-2xl font-bold text-gray-900">{summaryData?.submitted_count || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
            <div className={`p-3.5 rounded-xl ${viewMode === 'ALL_TIME' || viewMode === 'MY_EOD' ? 'bg-gray-50 text-gray-400' : 'bg-orange-50 text-orange-500'}`}><Clock size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Pending Submissions</p>
              <h3 className={`text-2xl font-bold ${viewMode === 'ALL_TIME' || viewMode === 'MY_EOD' ? 'text-gray-300' : 'text-gray-900'}`}>{viewMode === 'ALL_TIME' || viewMode === 'MY_EOD' ? '—' : (summaryData?.not_submitted_count || 0)}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
            <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600"><Calendar size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Scope / View</p>
              <h3 className="text-lg font-bold text-gray-900 capitalize">{viewMode.replace('_', ' ')}</h3>
            </div>
          </div>
        </div>

        {/* FILTERS & SUBMIT BUTTON */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
              <Calendar size={16} className="text-gray-500" /> All Dates <ChevronDown size={16} className="text-gray-400 ml-1" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name..." className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-50 w-64 shadow-sm transition-all" />
            </div>
            <button onClick={() => setIsSubmitModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-blue-500/20 active:scale-95 transition-all">
              <Plus size={16} /> Submit EOD
            </button>
          </div>
        </div>

        {/* CALENDAR WIDGET */}
        {viewMode === 'CALENDAR' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-purple-600 w-5 h-5" />
                <h2 className="text-lg font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</h2>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(currentYear-1)) : setCurrentMonth(currentMonth-1)} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(currentYear+1)) : setCurrentMonth(currentMonth+1)} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((day, idx) => {
                const cellDate = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                const isSelected = cellDate === selectedCalendarDate;
                const totalEODs = getEODsCountForDate(day);
                return (
                  <div key={idx} className="min-h-[70px] border border-gray-100 rounded-xl p-1.5 flex flex-col justify-between bg-gray-50/30">
                    {day && (
                      <>
                        <button onClick={() => setSelectedCalendarDate(cellDate)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-gray-800 hover:bg-gray-200/60'}`}>{day}</button>
                        {totalEODs > 0 && (
                          <div className="w-full flex justify-center mt-1">
                            <span className="text-[10px] bg-green-50 text-green-700 font-bold border border-green-100 px-1.5 py-0.5 rounded-md">{totalEODs} EOD</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MAIN DATA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          
          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between px-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex gap-8">
                {[
                  { id: 'ALL', label: 'All Status' },
                  { id: 'SUBMITTED', label: 'Submitted Only' },
                  { id: 'PENDING', label: 'Pending Only' }
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {viewMode === 'CALENDAR' && <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-100">Showing: {selectedCalendarDate}</span>}
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">User</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Department</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Overall Progress</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center"><div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></td></tr>
                  ) : displayedReports.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">No reports to display in this view.</td></tr>
                  ) : (
                    displayedReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${report.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                              {report.avatar}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{report.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5 capitalize">{report.role} • {report.projectName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">{report.dept}</td>
                        <td className="px-6 py-4 text-gray-600">{report.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${report.status === 'Submitted' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {report.progress > 0 ? (
                            <div className="flex items-center gap-3 w-32">
                              <span className="font-semibold text-gray-700">{report.progress}%</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${report.progress === 100 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${report.progress}%` }} /></div>
                            </div>
                          ) : <span className="text-gray-400 font-medium">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className={`p-2 rounded-lg border ${report.status === 'Submitted' ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'}`}>
                              {report.status === 'Submitted' ? <Eye size={16} /> : <Send size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-6">Completion Status</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path className="text-gray-100" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-500" strokeDasharray={`${summaryData?.total_members ? (summaryData.submitted_count / summaryData.total_members) * 100 : 0}, 100`} strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold">{summaryData?.total_members ? Math.round((summaryData.submitted_count / summaryData.total_members) * 100) : 0}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Submitted</span><span className="font-bold">{summaryData?.submitted_count || 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Pending</span><span className="font-bold">{summaryData?.not_submitted_count || 0}</span></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-5">Quick Actions</h3>
              <div className="space-y-2.5">
                {[
                  { icon: LayoutList, label: 'Show My EOD', action: fetchMyReports },
                  { icon: UserX, label: 'Show Defaulters', action: fetchNonSubmitters },
                  { icon: Clock, label: 'View All History', action: fetchAllReports },
                  { icon: CalendarDays, label: 'Calendar View', action: () => setViewMode('CALENDAR') },
                ].map((action, idx) => (
                  <button key={idx} onClick={action.action} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 group transition-all">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-blue-700">
                      <div className="text-blue-600 bg-blue-50 p-1.5 rounded-lg"><action.icon size={18} /></div> {action.label}
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- SUBMIT EOD MODAL --- */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submit Daily EOD</h2>
                <p className="text-sm text-gray-500 mt-1">Record your progress for today.</p>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                <span className="text-lg font-bold">&times;</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="eodForm" onSubmit={handleSubmitEOD} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project</label>
                  <select 
                    required 
                    value={eodForm.project_id} 
                    onChange={(e) => setEodForm({...eodForm, project_id: e.target.value})} 
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                  >
                    <option value="" disabled>Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id ?? project?.project_id ?? JSON.stringify(project)} value={project.id ?? project?.project_id ?? ''}>
                        {typeof project === 'string' ? project : (project?.name ?? project?.project_name ?? `Project ${project?.id ?? project?.project_id ?? ''}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Completed Work</label>
                  <textarea required rows="3" value={eodForm.completed_work} onChange={(e) => setEodForm({...eodForm, completed_work: e.target.value})} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pending Work</label>
                  <textarea rows="2" value={eodForm.pending_work} onChange={(e) => setEodForm({...eodForm, pending_work: e.target.value})} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delay Reason (If Any)</label>
                  <textarea rows="2" value={eodForm.delay_reason} onChange={(e) => setEodForm({...eodForm, delay_reason: e.target.value})} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Plan for Tomorrow</label>
                  <textarea required rows="2" value={eodForm.tomorrow_plan} onChange={(e) => setEodForm({...eodForm, tomorrow_plan: e.target.value})} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Support Required</label>
                  <textarea rows="2" value={eodForm.support_required} onChange={(e) => setEodForm({...eodForm, support_required: e.target.value})} className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"></textarea>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button form="eodForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70">
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}