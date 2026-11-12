// components/Dashboard.jsx
"use client";

import React from 'react';
import { 
  CheckSquare, Folder, Sparkles, Calendar as CalendarIcon, 
  Search, Users, Bell, Plus, MoreVertical, ArrowUp, ArrowDown, Settings,
  ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- MOCK DATA ---
const areaChartData = [
  { name: 'Mon', tasks: 10 }, { name: 'Tue', tasks: 25 }, { name: 'Wed', tasks: 38 },
  { name: 'Thu', tasks: 18 }, { name: 'Fri', tasks: 22 }, { name: 'Sat', tasks: 10 }, { name: 'Sun', tasks: 8 },
];

const pieChartData = [
  { name: 'Completed', value: 85, color: '#3b82f6' },
  { name: 'In Progress', value: 32, color: '#6366f1' },
  { name: 'Pending', value: 20, color: '#f59e0b' },
  { name: 'Review', value: 1, color: '#8b5cf6' },
  { name: 'Overdue', value: 11, color: '#ef4444' },
];

const recentTasks = [
  { id: 1, name: 'Design Dashboard UI', project: 'Project Phoenix', projectColor: 'bg-purple-500', assignedTo: 'Sarah Johnson', status: 'In Progress', statusColor: 'bg-blue-100 text-blue-700', dueDate: 'May 24, 2024' },
  { id: 2, name: 'API Integration', project: 'Backend Upgrade', projectColor: 'bg-green-500', assignedTo: 'Michael Brown', status: 'Completed', statusColor: 'bg-green-100 text-green-700', dueDate: 'May 22, 2024' },
  { id: 3, name: 'User Research', project: 'Market Analysis', projectColor: 'bg-orange-500', assignedTo: 'Emily Davis', status: 'Pending', statusColor: 'bg-orange-100 text-orange-700', dueDate: 'May 26, 2024' },
  { id: 4, name: 'Performance Testing', project: 'Mobile App', projectColor: 'bg-blue-500', assignedTo: 'James Wilson', status: 'In Progress', statusColor: 'bg-blue-100 text-blue-700', dueDate: 'May 25, 2024' },
  { id: 5, name: 'Documentation', project: 'Internal Tools', projectColor: 'bg-purple-500', assignedTo: 'Jessica Lee', status: 'Review', statusColor: 'bg-purple-100 text-purple-700', dueDate: 'May 27, 2024' },
];

const projectsOverview = [
  { name: 'Project Phoenix', progress: 75, due: 'Jun 15, 2024', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100', bar: 'bg-blue-600' },
  { name: 'Backend Upgrade', progress: 60, due: 'Jun 30, 2024', icon: Folder, color: 'text-green-600', bg: 'bg-green-100', bar: 'bg-green-500' },
  { name: 'Mobile App', progress: 40, due: 'Jul 10, 2024', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-400' },
  { name: 'Marketing Campaign', progress: 30, due: 'Jun 20, 2024', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-100', bar: 'bg-orange-400' },
];

function Smartphone(props) { return <div {...props}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg></div> }

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, Admin! 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your workspace today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 shadow-sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            May 20 - May 26, 2024
          </div>
          <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Create New
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Tasks" value="128" icon={CheckSquare} iconColor="text-blue-600" bg="bg-blue-50" trend="up" trendValue="12%" />
        <StatCard title="Completed Tasks" value="85" icon={ShieldCheck} iconColor="text-green-600" bg="bg-green-50" trend="up" trendValue="18%" />
        <StatCard title="In Progress" value="32" icon={CalendarIcon} iconColor="text-orange-500" bg="bg-orange-50" trend="down" trendValue="5%" />
        <StatCard title="Overdue Tasks" value="11" icon={Search} iconColor="text-purple-600" bg="bg-purple-50" trend="down" trendValue="8%" />
        <StatCard title="Team Members" value="24" icon={Users} iconColor="text-blue-500" bg="bg-blue-50" trend="up" trendValue="7%" />
      </div>

      {/* Middle Row: Charts & AI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Area Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Tasks Overview</h3>
            <select className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-6">Tasks by Status</h3>
          <div className="flex-1 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-600">
            {pieChartData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span>{item.name} <span className="font-medium text-gray-900 ml-1">({item.value}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
            </div>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="flex-1 space-y-4">
              <AiCard 
                title="Prioritize Task UX Design" 
                desc="This task is critical for Project Phoenix and is overdue by 2 days." 
                action="View Task" 
                icon={Sparkles} color="text-purple-600" bg="bg-purple-50" 
              />
              <AiCard 
                title="Balance Workload" 
                desc="Alex has 8 pending tasks. Consider redistributing some tasks." 
                action="View Team" 
                icon={Users} color="text-green-600" bg="bg-green-50" 
              />
              <AiCard 
                title="Automate Report Generation" 
                desc="Save 3+ hours weekly by automating these recurring reports." 
                action="Learn More" 
                icon={Settings} color="text-orange-500" bg="bg-orange-50" 
              />
          </div>
        </div>
      </div>

      {/* Bottom Row: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        
        {/* Recent Tasks Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Task Name</th>
                  <th className="px-6 py-4 font-medium">Project</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Due Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <div className="w-4 h-4 border border-gray-300 rounded-sm"></div>
                      {task.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${task.projectColor}`}></div>
                        {task.project}
                      </div>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedTo}`} alt={task.assignedTo} />
                      </div>
                      {task.assignedTo}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${task.statusColor}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{task.dueDate}</td>
                    <td className="px-6 py-4 text-right text-gray-400 hover:text-gray-600 cursor-pointer">
                      <MoreVertical className="w-5 h-5 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Projects Overview */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Projects Overview</h3>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</a>
          </div>
          <div className="space-y-6">
            {projectsOverview.map((project, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${project.bg} flex items-center justify-center`}>
                      <project.icon className={`w-5 h-5 ${project.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                      <p className="text-xs text-gray-500">Due: {project.due}</p>
                    </div>
                  </div>
                  <span className="font-medium text-sm text-gray-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`${project.bar} h-1.5 rounded-full`} style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-components used inside Dashboard
function StatCard({ title, value, icon: Icon, iconColor, bg, trend, trendValue }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      </div>
      <div className="flex items-end justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
        <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
          {trendValue} <span className="text-gray-400 ml-1 font-normal hidden xl:inline">from last week</span>
        </div>
      </div>
    </div>
  );
}

function AiCard({ title, desc, action, icon: Icon, color, bg }) {
  return (
    <div className="p-4 border border-gray-100 rounded-lg flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 mb-2 leading-relaxed">{desc}</p>
        <a href="#" className={`text-xs font-medium ${color} hover:underline`}>{action}</a>
      </div>
    </div>
  );
}