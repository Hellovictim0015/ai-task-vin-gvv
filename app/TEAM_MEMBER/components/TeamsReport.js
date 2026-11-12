"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, User, BarChart2, CheckCircle, 
  Clock, AlertTriangle, TrendingUp, Award, CalendarDays,
  Target, Activity, FileText, ChevronDown // Added ChevronDown
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';
export default function PerformanceReport() {
  // Filters State
  const [phone, setPhone] = useState('8827219873');
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState(1);

  // Users Dropdown State
  const [users, setUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Data & Loading States
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Fetch Users API ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
        const response = await fetch(`${BASE_URL}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();
  }, []);

  // Fetch Report API
  const fetchReport = async (e) => {
    if (e) e.preventDefault();
    if (!phone) {
      setError("Please select a user");
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      
      let url = `${BASE_URL}/performance/by-phone?phone=${phone}&period=${period}&year=${year}`;
      if (period === 'month') url += `&month=${month}`;
      if (period === 'week') url += `&week=${week}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine Grade Color
  const getGradeColor = (grade) => {
    switch(grade) {
      case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'F': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Derived state to find the currently selected user object for display purposes
  const selectedUser = users.find(u => u.phone === phone);

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Performance Report</h1>
          <p className="text-gray-500 text-sm mt-1">Analyze user performance, task completion, and EOD compliance.</p>
        </div>

        {/* CONTROLS / FILTER BAR */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <form onSubmit={fetchReport} className="flex flex-wrap items-end gap-4">
            
            {/* User Dropdown Selector */}
            <div className="relative flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Select User</label>
              
              <div 
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer flex justify-between items-center hover:border-blue-500 focus:border-blue-500 transition-all shadow-sm"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className={selectedUser ? "text-gray-900 font-medium" : "text-gray-400"}>
                  {selectedUser ? `${selectedUser.name} (${selectedUser.phone})` : "Select a user..."}
                </span>
                <ChevronDown size={16} className={`text-gray-400 absolute right-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">Loading users...</div>
                  ) : (
                    users.map(user => (
                      <div 
                        key={user.id} 
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-b-0 flex justify-between items-center transition-colors"
                        onClick={() => {
                          setPhone(user.phone); // Pura object nahi, sirf phone number API ke liye set kiya
                          setShowDropdown(false);
                        }}
                      >
                        <div>
                          <span className="font-medium text-gray-900 text-sm block">{user.name}</span>
                          <span className="text-xs text-gray-400 block">Phone: {user.phone}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-100 px-2 py-1 rounded-full uppercase tracking-wide shadow-sm">
                          {user.department?.name || user.role.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Period Selector */}
            <div className="w-36">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Period</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white shadow-sm"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>

            {/* Year Selector */}
            <div className="w-28">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Year</label>
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Conditional Month Selector */}
            {period === 'month' && (
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Month</label>
                <select 
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white shadow-sm"
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en-US', { month: 'short' })}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditional Week Selector */}
            {period === 'week' && (
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Week</label>
                <input 
                  type="number" 
                  min="1" max="52"
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm"
                />
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-70 h-[42px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : <BarChart2 size={16} />}
              Generate Report
            </button>
          </form>

          {error && <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5"><AlertTriangle size={14}/> {error}</p>}
        </div>

        {/* RESULTS SECTION */}
        {!reportData && !isLoading && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-gray-900">No Report Generated</h3>
            <p className="text-sm mt-1 text-center max-w-sm">Select a user and period to view the performance report.</p>
          </div>
        )}

        {/* ... (THE REST OF THE REPORT REMAINS EXACTLY THE SAME) ... */}
        {reportData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* USER & OVERVIEW BANNER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Profile Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {reportData.user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{reportData.user.name}</h2>
                    <p className="text-sm text-gray-500 capitalize">{reportData.user.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-2 border-t border-gray-50 pt-4">
                  <div className="flex items-center text-sm text-gray-600"><User size={14} className="mr-2 text-gray-400"/> {reportData.user.phone}</div>
                  <div className="flex items-center text-sm text-gray-600"><CalendarDays size={14} className="mr-2 text-gray-400"/> {reportData.report_period.start_date} to {reportData.report_period.end_date}</div>
                  <div className="flex items-center text-sm">
                    <Activity size={14} className="mr-2 text-gray-400"/> 
                    Status: <span className={`ml-1 font-medium ${reportData.user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      {reportData.user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Overall Performance Score */}
              <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl border border-gray-800 shadow-lg p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10"><Award size={180} /></div>
                
                <div className="z-10 text-center sm:text-left">
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">Overall Performance</p>
                  <h2 className="text-4xl font-extrabold flex items-baseline justify-center sm:justify-start gap-2">
                    {reportData.performance_score.overall_score.toFixed(1)}<span className="text-xl text-gray-400 font-medium">/ 100</span>
                  </h2>
                  <p className="text-gray-300 mt-2 text-sm max-w-sm">
                    Based on task completion, on-time delivery, and EOD compliance rates for this period.
                  </p>
                </div>

                <div className="z-10 flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Grade</p>
                    <div className={`px-4 py-1.5 rounded-lg border font-bold text-lg ${getGradeColor(reportData.performance_score.grade)}`}>
                      Grade {reportData.performance_score.grade}
                    </div>
                  </div>
                  <div className="text-left border-l border-gray-700 pl-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Rating</p>
                    <div className="text-xl font-semibold text-white">
                      {reportData.performance_score.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DETAILED METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Task Performance Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><Target className="text-blue-500" size={18}/> Task Performance</h3>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100">
                    {reportData.task_performance.completion_rate}% Complete
                  </span>
                </div>
                
                <div className="p-5 space-y-5">
                  {/* Visual Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-gray-600">Total Assigned: {reportData.task_performance.total_assigned}</span>
                      <span className="text-blue-600">{reportData.task_performance.completed} Completed</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 h-full" style={{width: `${(reportData.task_performance.on_time_completed / reportData.task_performance.total_assigned) * 100}%`}} title="On Time"></div>
                      <div className="bg-yellow-400 h-full" style={{width: `${(reportData.task_performance.late_completed / reportData.task_performance.total_assigned) * 100}%`}} title="Late Completed"></div>
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold text-gray-500">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> On Time</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Late Complete</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-200"></div> Pending</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">On-Time Rate</p>
                      <p className="text-lg font-bold text-gray-900">{reportData.task_performance.on_time_rate}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Delay Rate</p>
                      <p className="text-lg font-bold text-gray-900">{reportData.task_performance.delay_rate}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Delayed Tasks</p>
                      <p className="text-lg font-bold text-orange-600">{reportData.task_performance.delayed}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Not Started</p>
                      <p className="text-lg font-bold text-gray-900">{reportData.task_performance.not_started}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* EOD Compliance Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="text-purple-500" size={18}/> EOD Compliance</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${reportData.eod_compliance.compliance_rate >= 80 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                    {reportData.eod_compliance.compliance_rate}% Rate
                  </span>
                </div>
                
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-purple-500 transition-all duration-1000 ease-out" strokeDasharray={`${reportData.eod_compliance.compliance_rate}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold text-gray-900">{reportData.eod_compliance.compliance_rate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 font-medium">Working Days</p>
                      <p className="text-lg font-bold text-gray-900">{reportData.eod_compliance.total_working_days}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                      <p className="text-xs text-green-700 font-medium">Submitted</p>
                      <p className="text-lg font-bold text-green-700">{reportData.eod_compliance.submitted}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                      <p className="text-xs text-red-700 font-medium">Missed</p>
                      <p className="text-lg font-bold text-red-700">{reportData.eod_compliance.missed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Detail Cards */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Task Score</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{reportData.performance_score.breakdown.task_completion_score} <span className="text-xs text-gray-400 font-medium">pts</span></p>
                  </div>
                  <CheckCircle className="text-blue-100 w-10 h-10" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">On-Time Score</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{reportData.performance_score.breakdown.on_time_score} <span className="text-xs text-gray-400 font-medium">pts</span></p>
                  </div>
                  <TrendingUp className="text-green-100 w-10 h-10" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">EOD Score</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{reportData.performance_score.breakdown.eod_compliance_score} <span className="text-xs text-gray-400 font-medium">pts</span></p>
                  </div>
                  <FileText className="text-purple-100 w-10 h-10" />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}