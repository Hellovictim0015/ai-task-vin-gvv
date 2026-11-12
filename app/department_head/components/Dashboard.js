"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Folder, Sparkles, Calendar as CalendarIcon, 
  AlertTriangle, ShieldCheck, Plus
} from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BASE_URL } from '@/lib/api';
export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      
        const response = await fetch(`${BASE_URL}/dashboard/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardSummary();
     
  }, []);

  // Format today's date
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Dynamic Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning, Prakhar Bagora Sir 👋";
    if (hour < 17) return "Good Afternoon, Prakhar Bagora Sir ☀️";
    if (hour < 21) return "Good Evening, Prakhar Bagora Sir 🌆";
    return "Good Night, Prakhar Bagora Sir 🌙";
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center text-red-600 bg-red-50 rounded-2xl mt-6 border border-red-100 shadow-sm">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-80" />
        <p className="text-lg font-bold">Failed to load dashboard</p>
        <p className="text-sm font-medium mt-1">{error}</p>
      </div>
    );
  }

  // --- DYNAMIC DATA MAPPING ---
  const { summary, project_summaries, delayed_tasks } = dashboardData;

  // Prepare Dynamic Pie Chart Data
  const dynamicPieChartData = [
    { name: 'Completed', value: summary.completed_tasks, color: '#10b981' }, 
    { name: 'Pending', value: summary.pending_tasks, color: '#f59e0b' },    
    { name: 'Overdue', value: summary.overdue_tasks, color: '#ef4444' },    
  ].filter(item => item.value > 0);

  // Fallback if all values are 0
  if (dynamicPieChartData.length === 0) {
    dynamicPieChartData.push({ name: 'No Tasks', value: 1, color: '#e2e8f0' });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      
      {/* --- GREETING & HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">  Here's what's happening with your workspace today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700">
            <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
            {today}
          </div>
        
        </div>
      </div>

      {/* --- KPI STAT CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Tasks Today" value={summary.total_tasks_today} icon={CheckSquare} iconColor="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Pending Tasks" value={summary.pending_tasks} icon={CalendarIcon} iconColor="text-orange-500" bg="bg-orange-50" />
        <StatCard title="Overdue Tasks" value={summary.overdue_tasks} icon={AlertTriangle} iconColor="text-red-600" bg="bg-red-50" />
        <StatCard title="High Priority" value={summary.high_priority_tasks} icon={Sparkles} iconColor="text-purple-600" bg="bg-purple-50" />
        <StatCard title="EOD Submitted" value={summary.eod_submitted} icon={ShieldCheck} iconColor="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* --- MIDDLE SECTION: CHART & PROJECTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Donut Chart (1 Column) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            Today's Task Status
          </h3>
          <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dynamicPieChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                  {dynamicPieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-4xl font-extrabold text-gray-900">{summary.total_tasks_today}</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Total</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-semibold text-gray-600 border-t border-gray-50 pt-4">
            {dynamicPieChartData.map(item => (
              <div key={item.name} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                <span>{item.name} <span className="font-bold text-gray-900 ml-1">{item.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Overview (2 Columns) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
              Projects Health
            </h3>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">View Details</button>
          </div>
          
          <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
            {project_summaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                <Folder className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No active projects found.</p>
              </div>
            ) : (
              project_summaries.map((project) => (
                <div key={project.project_id} className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl hover:border-blue-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                        <Folder className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base capitalize">{project.project_name}</p>
                        <p className="text-xs text-gray-500 font-semibold mt-1">
                          {project.completed} / {project.total_tasks} Tasks Completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-lg text-gray-900">{project.completion_percentage.toFixed(0)}%</span>
                      {project.delayed > 0 && (
                        <div className="mt-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">
                          {project.delayed} Delayed
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        project.completion_percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} 
                      style={{ width: `${project.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- BOTTOM SECTION: TABLE --- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-red-500 rounded-full"></div>
            <h3 className="font-bold text-gray-900 text-lg">Delayed & Critical Tasks</h3>
            {delayed_tasks.length > 0 && (
              <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                {delayed_tasks.length}
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Task Title</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Escalation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {delayed_tasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
                        <CheckSquare className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="font-bold text-gray-900 text-lg">No delayed tasks!</p>
                      <p className="text-sm mt-1">Your team is perfectly on schedule.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                delayed_tasks.map((task) => (
                  <tr key={task.task_id} className="bg-white hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {task.task_title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 capitalize shadow-sm">
                        {task.project_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3 font-semibold text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm">
                        {task.assigned_to.charAt(0)}
                      </div>
                      {task.assigned_to}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-red-600 font-bold bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-widest shadow-sm border ${
                        task.escalation_level === 'level_1' 
                          ? 'bg-orange-50 text-orange-700 border-orange-200' 
                          : task.escalation_level 
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {task.escalation_level ? task.escalation_level.replace('_', ' ') : 'None'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// Reusable Sub-component for KPI Cards
function StatCard({ title, value, icon: Icon, iconColor, bg }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-100 group">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 line-clamp-2 leading-relaxed">{title}</h4>
      </div>
      <div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h2>
      </div>
    </div>
  );
}