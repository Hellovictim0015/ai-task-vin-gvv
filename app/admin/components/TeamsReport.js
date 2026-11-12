"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, User, BarChart2, CheckCircle,
  TrendingUp, Award, CalendarDays, AlertTriangle,
  Target, Activity, FileText, ChevronDown, Download, Users, ArrowLeft
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'short' }));
const CONCURRENCY = 5;

// Helper to determine Grade Color
const getGradeColor = (grade) => {
  switch (grade) {
    case 'A+':
    case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'F': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const pct = (part, total) => (total ? (part / total) * 100 : 0);

// Load SheetJS (served from /public/vendor) only when the user clicks Export
let xlsxPromise = null;
function loadXlsx() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'));
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/xlsx.full.min.js';
      script.async = true;
      script.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel library failed to load')));
      script.onerror = () => { xlsxPromise = null; reject(new Error('Excel library failed to load')); };
      document.body.appendChild(script);
    });
  }
  return xlsxPromise;
}

export default function PerformanceReport() {
  // Filters State
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [week, setWeek] = useState(1);

  // Users Dropdown State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Data & Loading States
  const [reports, setReports] = useState([]);          // successful reports
  const [failures, setFailures] = useState([]);        // [{ name, phone, error }]
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [activePhone, setActivePhone] = useState(null); // which report is open in detail view
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showDropdown]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.department?.name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const allSelected = users.length > 0 && selectedPhones.length === users.length;
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedPhones.includes(u.phone));

  const toggleUser = (phone) => {
    setSelectedPhones(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
  };

  const toggleAllFiltered = () => {
    const phones = filteredUsers.map(u => u.phone);
    if (allFilteredSelected) {
      setSelectedPhones(prev => prev.filter(p => !phones.includes(p)));
    } else {
      setSelectedPhones(prev => Array.from(new Set([...prev, ...phones])));
    }
  };

  const selectionLabel = () => {
    if (selectedPhones.length === 0) return null;
    if (allSelected) return `All users (${users.length})`;
    if (selectedPhones.length === 1) {
      const u = users.find(x => x.phone === selectedPhones[0]);
      return u ? `${u.name} (${u.phone})` : selectedPhones[0];
    }
    return `${selectedPhones.length} users selected`;
  };

  const periodLabel = () => {
    if (period === 'year') return `${year}`;
    if (period === 'month') return `${MONTHS[month - 1]} ${year}`;
    return `Week ${week}, ${year}`;
  };

  // Fetch one user's report
  const fetchOne = async (phone, token) => {
    let url = `${BASE_URL}/performance/by-phone?phone=${encodeURIComponent(phone)}&period=${period}&year=${year}`;
    if (period === 'month') url += `&month=${month}`;
    if (period === 'week') url += `&week=${week}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Failed to fetch report');
    }
    return response.json();
  };

  // Fetch reports for all selected users (a few at a time)
  const fetchReports = async (e) => {
    if (e) e.preventDefault();
    if (selectedPhones.length === 0) {
      setError("Please select at least one user");
      return;
    }

    setIsLoading(true);
    setError('');
    setReports([]);
    setFailures([]);
    setActivePhone(null);
    setShowDropdown(false);
    setProgress({ done: 0, total: selectedPhones.length });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    // Keep the order the users appear in the list
    const queue = users.filter(u => selectedPhones.includes(u.phone)).map(u => u.phone);
    selectedPhones.forEach(p => { if (!queue.includes(p)) queue.push(p); });

    const results = new Array(queue.length);
    const failed = [];
    let next = 0;
    let done = 0;

    const worker = async () => {
      while (next < queue.length) {
        const i = next++;
        const phone = queue[i];
        try {
          results[i] = await fetchOne(phone, token);
        } catch (err) {
          const u = users.find(x => x.phone === phone);
          failed.push({ name: u?.name ?? phone, phone, error: err.message });
        } finally {
          done += 1;
          setProgress({ done, total: queue.length });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    const ok = results.filter(Boolean);
    setReports(ok);
    setFailures(failed);
    if (ok.length === 1) setActivePhone(ok[0].user.phone);
    if (ok.length === 0) setError(failed[0]?.error || 'Failed to fetch report');
    setIsLoading(false);
  };

  // --- Excel Export ---
  const exportToExcel = async () => {
    if (!reports.length) return;
    setIsExporting(true);
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();

      const summary = reports.map((r, i) => ({
        'S.No': i + 1,
        'Name': r.user.name,
        'Phone': r.user.phone,
        'Email': r.user.email ?? '',
        'Role': r.user.role?.replace(/_/g, ' '),
        'Status': r.user.is_active ? 'Active' : 'Inactive',
        'Period': periodLabel(),
        'Start Date': r.report_period.start_date,
        'End Date': r.report_period.end_date,
        'Overall Score': r.performance_score.overall_score,
        'Grade': r.performance_score.grade,
        'Rating': r.performance_score.label,
        'Task Score': r.performance_score.breakdown.task_completion_score,
        'On-Time Score': r.performance_score.breakdown.on_time_score,
        'EOD Score': r.performance_score.breakdown.eod_compliance_score,
        'Tasks Assigned': r.task_performance.total_assigned,
        'Completed': r.task_performance.completed,
        'In Progress': r.task_performance.in_progress,
        'Not Started': r.task_performance.not_started,
        'Delayed': r.task_performance.delayed,
        'On-Time Completed': r.task_performance.on_time_completed,
        'Late Completed': r.task_performance.late_completed,
        'Completion Rate %': r.task_performance.completion_rate,
        'On-Time Rate %': r.task_performance.on_time_rate,
        'Delay Rate %': r.task_performance.delay_rate,
        'Working Days': r.eod_compliance.total_working_days,
        'EOD Submitted': r.eod_compliance.submitted,
        'EOD Missed': r.eod_compliance.missed,
        'EOD Compliance %': r.eod_compliance.compliance_rate
      }));

      const tasks = reports.flatMap(r => (r.task_performance.tasks_detail || []).map(t => ({
        'Name': r.user.name,
        'Phone': r.user.phone,
        'Task ID': t.id,
        'Title': t.title,
        'Project ID': t.project_id,
        'Priority': t.priority,
        'Status': t.status?.replace(/_/g, ' '),
        'Due Date': t.due_date,
        'Completed At': t.completed_at ?? '',
        'On Time': t.on_time === null ? '' : (t.on_time ? 'Yes' : 'No'),
        'Delay Reason': t.delay_reason ?? ''
      })));

      const eods = reports.flatMap(r => (r.eod_compliance.reports || []).map(e => ({
        'Name': r.user.name,
        'Phone': r.user.phone,
        'Date': e.date,
        'Completed Work': e.completed_work ?? '',
        'Pending Work': e.pending_work ?? '',
        'Delay Reason': e.delay_reason ?? '',
        'Tomorrow Plan': e.tomorrow_plan ?? '',
        'Support Required': e.support_required ?? '',
        'Submitted At': e.submitted_at ?? ''
      })));

      const addSheet = (rows, name, emptyHeaders) => {
        const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([emptyHeaders]);
        const headers = rows.length ? Object.keys(rows[0]) : emptyHeaders;
        ws['!cols'] = headers.map(h => {
          const longest = Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length));
          return { wch: Math.min(Math.max(longest + 2, 10), 60) };
        });
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(summary, 'Summary', ['Name']);
      addSheet(tasks, 'Tasks', ['Name', 'Phone', 'Task ID', 'Title', 'Project ID', 'Priority', 'Status', 'Due Date', 'Completed At', 'On Time', 'Delay Reason']);
      addSheet(eods, 'EOD Reports', ['Name', 'Phone', 'Date', 'Completed Work', 'Pending Work', 'Delay Reason', 'Tomorrow Plan', 'Support Required', 'Submitted At']);

      const who = reports.length === 1 ? reports[0].user.name.replace(/[^\w]+/g, '_') : `${reports.length}_users`;
      XLSX.writeFile(wb, `Performance_Report_${who}_${periodLabel().replace(/[^\w]+/g, '_')}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Excel export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const activeReport = reports.find(r => r.user.phone === activePhone) || null;
  const hasResults = reports.length > 0;

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
          <form onSubmit={fetchReports} className="flex flex-wrap items-end gap-4">

            {/* Multi-select User Dropdown */}
            <div className="relative flex-1 min-w-[240px]" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Select Users</label>

              <button
                type="button"
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer flex justify-between items-center hover:border-blue-500 focus:border-blue-500 transition-all shadow-sm text-left relative"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className={selectedPhones.length ? "text-gray-900 font-medium truncate" : "text-gray-400"}>
                  {selectionLabel() ?? "Select users..."}
                </span>
                <ChevronDown size={16} className={`text-gray-400 absolute right-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, phone, role..."
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Select all / clear */}
                  {users.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleAllFiltered}
                          className="h-4 w-4 accent-blue-600 cursor-pointer"
                        />
                        {search ? `Select all matching (${filteredUsers.length})` : `Select all (${users.length})`}
                      </label>
                      {selectedPhones.length > 0 && (
                        <button type="button" onClick={() => setSelectedPhones([])} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto">
                    {usersLoading ? (
                      <div className="p-3 text-sm text-gray-500 text-center">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">No users found</div>
                    ) : (
                      filteredUsers.map(user => {
                        const checked = selectedPhones.includes(user.phone);
                        return (
                          <label
                            key={user.id}
                            className={`p-3 cursor-pointer border-b border-gray-50 last:border-b-0 flex items-center gap-3 transition-colors ${checked ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(user.phone)}
                              className="h-4 w-4 accent-blue-600 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900 text-sm block truncate">{user.name}</span>
                              <span className="text-xs text-gray-400 block">Phone: {user.phone}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-100 px-2 py-1 rounded-full uppercase tracking-wide shadow-sm shrink-0">
                              {user.department?.name || user.role?.replace(/_/g, ' ')}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-gray-100 flex justify-end">
                    <button type="button" onClick={() => setShowDropdown(false)} className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Done ({selectedPhones.length})
                    </button>
                  </div>
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
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
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
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Conditional Week Selector */}
            {period === 'week' && (
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Week</label>
                <input
                  type="number"
                  min="1" max="53"
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value) || 1)}
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
              {isLoading && progress.total > 1 ? `Generating ${progress.done}/${progress.total}` : 'Generate Report'}
            </button>
          </form>

          {error && <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5"><AlertTriangle size={14} /> {error}</p>}
        </div>

        {/* EMPTY STATE */}
        {!hasResults && !isLoading && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-gray-900">No Report Generated</h3>
            <p className="text-sm mt-1 text-center max-w-sm">Select one, many or all users and a period to view the performance report.</p>
          </div>
        )}

        {/* RESULTS TOOLBAR (Export) */}
        {hasResults && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Users size={16} className="text-blue-600" />
              <span className="font-semibold">{reports.length} {reports.length === 1 ? 'report' : 'reports'}</span>
              <span className="text-gray-400">·</span>
              <span>{periodLabel()}</span>
            </div>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {isExporting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Download size={16} />}
              Export to Excel
            </button>
          </div>
        )}

        {/* FAILURES */}
        {failures.length > 0 && hasResults && (
          <div className="bg-orange-50 border border-orange-100 text-orange-800 rounded-2xl p-4 text-sm">
            <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertTriangle size={14} /> Report could not be generated for {failures.length} {failures.length === 1 ? 'user' : 'users'}:</p>
            <ul className="list-disc ml-6">
              {failures.map(f => <li key={f.phone}>{f.name} ({f.phone}) — {f.error}</li>)}
            </ul>
          </div>
        )}

        {/* MULTI-USER SUMMARY TABLE */}
        {reports.length > 1 && !activeReport && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="text-blue-500" size={18} /> Team Summary</h3>
              <p className="text-xs text-gray-500 mt-1">Click a row to see that user&apos;s full report.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">User</th>
                    <th className="text-center px-3 py-3 font-semibold">Score</th>
                    <th className="text-center px-3 py-3 font-semibold">Grade</th>
                    <th className="text-center px-3 py-3 font-semibold">Tasks</th>
                    <th className="text-center px-3 py-3 font-semibold">Completed</th>
                    <th className="text-center px-3 py-3 font-semibold">Delayed</th>
                    <th className="text-center px-3 py-3 font-semibold">On-Time %</th>
                    <th className="text-center px-3 py-3 font-semibold">EOD</th>
                    <th className="text-center px-3 py-3 font-semibold">EOD %</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr
                      key={r.user.phone}
                      onClick={() => setActivePhone(r.user.phone)}
                      className="border-t border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.user.name}</div>
                        <div className="text-xs text-gray-400">{r.user.phone} · <span className="capitalize">{r.user.role?.replace(/_/g, ' ')}</span></div>
                      </td>
                      <td className="text-center px-3 py-3 font-bold">{r.performance_score.overall_score.toFixed(1)}</td>
                      <td className="text-center px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-md border text-xs font-bold ${getGradeColor(r.performance_score.grade)}`}>{r.performance_score.grade}</span>
                      </td>
                      <td className="text-center px-3 py-3">{r.task_performance.total_assigned}</td>
                      <td className="text-center px-3 py-3 text-green-700">{r.task_performance.completed}</td>
                      <td className="text-center px-3 py-3 text-orange-600">{r.task_performance.delayed}</td>
                      <td className="text-center px-3 py-3">{r.task_performance.on_time_rate}%</td>
                      <td className="text-center px-3 py-3">{r.eod_compliance.submitted}/{r.eod_compliance.total_working_days}</td>
                      <td className="text-center px-3 py-3">{r.eod_compliance.compliance_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SINGLE USER DETAIL */}
        {activeReport && (
          <div className="space-y-4">
            {reports.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePhone(null)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Back to all {reports.length} reports
              </button>
            )}
            <ReportDetail reportData={activeReport} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDetail({ reportData }) {
  const tp = reportData.task_performance;
  return (
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
              <p className="text-sm text-gray-500 capitalize">{reportData.user.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="space-y-2 mt-2 border-t border-gray-50 pt-4">
            <div className="flex items-center text-sm text-gray-600"><User size={14} className="mr-2 text-gray-400" /> {reportData.user.phone}</div>
            <div className="flex items-center text-sm text-gray-600"><CalendarDays size={14} className="mr-2 text-gray-400" /> {reportData.report_period.start_date} to {reportData.report_period.end_date}</div>
            <div className="flex items-center text-sm">
              <Activity size={14} className="mr-2 text-gray-400" />
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
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Target className="text-blue-500" size={18} /> Task Performance</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100">
              {tp.completion_rate}% Complete
            </span>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600">Total Assigned: {tp.total_assigned}</span>
                <span className="text-blue-600">{tp.completed} Completed</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: `${pct(tp.on_time_completed, tp.total_assigned)}%` }} title="On Time"></div>
                <div className="bg-yellow-400 h-full" style={{ width: `${pct(tp.late_completed, tp.total_assigned)}%` }} title="Late Completed"></div>
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
                <p className="text-lg font-bold text-gray-900">{tp.on_time_rate}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Delay Rate</p>
                <p className="text-lg font-bold text-gray-900">{tp.delay_rate}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Delayed Tasks</p>
                <p className="text-lg font-bold text-orange-600">{tp.delayed}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Not Started</p>
                <p className="text-lg font-bold text-gray-900">{tp.not_started}</p>
              </div>
            </div>
          </div>
        </div>

        {/* EOD Compliance Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="text-purple-500" size={18} /> EOD Compliance</h3>
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
  );
}
