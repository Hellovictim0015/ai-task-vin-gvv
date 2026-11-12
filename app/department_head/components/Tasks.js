"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, CheckCircle2, Clock, AlertCircle, AlertOctagon, 
  Search, ChevronDown, MoreVertical, Calendar, ArrowUp, ArrowDown, 
  Minus, Rocket, Shield, Plus, X, Edit2, Save, Trash2, User
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BASE_URL } from '@/lib/api';

// --- API HELPER FUNCTIONS ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    let errorMessage = 'API request failed';
    
    if (err.detail) {
      if (Array.isArray(err.detail)) {
        errorMessage = err.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('\n');
      } else {
        errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    throw new Error(errorMessage);
  }
  return response.json();
};

// --- HELPER COMPONENTS ---
const PriorityBadge = ({ priority }) => {
  const p = priority?.toLowerCase() || 'low'; 
  if (p === 'high') return <span className="flex items-center text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-medium border border-red-100"><ArrowUp className="w-3 h-3 mr-1" /> High</span>;
  if (p === 'medium') return <span className="flex items-center text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-xs font-medium border border-orange-100"><Minus className="w-3 h-3 mr-1" /> Medium</span>;
  return <span className="flex items-center text-green-600 bg-green-50 px-2.5 py-1 rounded-md text-xs font-medium border border-green-100"><ArrowDown className="w-3 h-3 mr-1" /> Low</span>;
};

// Updated StatusBadge
const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || 'not_started';
  if (s === 'completed') return <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-100">Completed</span>;
  if (s === 'in_progress') return <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100">In Progress</span>;
  if (s === 'delayed') return <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-md text-xs font-medium border border-red-100">Delayed</span>;
  if (s === 'waiting') return <span className="text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-md text-xs font-medium border border-yellow-100">Waiting</span>;
  if (s === 'not_started') return <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200">Not Started</span>;
  
  return <span className="text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 capitalize">{s.replace('_', ' ')}</span>;
};

export default function Tasks() {
  const [activeTab, setActiveTab] = useState('All Tasks');
  const tabs = ['All Tasks', 'My Tasks', 'Assigned to Me', 'Created by Me', 'Following'];

  // --- DATA STATES ---
  const [tasks, setTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- CREATE MODAL STATES ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '', description: '', project_id: '', assigned_to_id: '',
    priority: 'medium', 
    due_date: '', due_time: '', remarks: ''
  });

  // --- VIEW / EDIT MODAL STATES ---
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // FIX: Added ALL required fields to the Edit Form State
  const [editTaskForm, setEditTaskForm] = useState({ 
    title: '', 
    priority: 'medium',
    assigned_to_id: '',
    due_date: '',
    remarks: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, overdueData, projectsData, usersData] = await Promise.all([
        apiFetch('/tasks/'),
        apiFetch('/tasks/overdue').catch(() => []),
        apiFetch('/projects/').catch(() => []),
        apiFetch('/users/').catch(() => [])
      ]);
      
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
      setOverdueTasks(Array.isArray(overdueData) ? overdueData : overdueData.tasks || []);
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData.projects || []);
      setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- API HANDLERS ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const formattedTime = newTaskForm.due_time.length === 5 
        ? `${newTaskForm.due_time}:00` 
        : newTaskForm.due_time;

      const payload = {
        title: newTaskForm.title,
        description: newTaskForm.description,
        project_id: parseInt(newTaskForm.project_id),
        assigned_to_id: parseInt(newTaskForm.assigned_to_id),
        priority: newTaskForm.priority.trim().toLowerCase(), 
        due_date: newTaskForm.due_date,
        due_time: formattedTime,
        remarks: newTaskForm.remarks || ""
      };

      await apiFetch('/tasks/', { method: 'POST', body: JSON.stringify(payload) });
      setIsCreateModalOpen(false);
      setNewTaskForm({ title: '', description: '', project_id: '', assigned_to_id: '', priority: 'medium', due_date: '', due_time: '', remarks: '' });
      fetchAllData(); 
    } catch (err) {
      alert("Error creating task: \n" + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewTask = async (id) => {
    setIsViewModalOpen(true);
    setIsEditMode(false);
    try {
      const data = await apiFetch(`/tasks/${id}`);
      setSelectedTask(data);
      // FIX: Populate all fields into edit state when opening task
      setEditTaskForm({ 
        title: data.title || '', 
        priority: data.priority?.toLowerCase() || 'medium',
        assigned_to_id: data.assigned_to_id || '',
        due_date: data.due_date || '',
        remarks: data.remarks || ''
      });
    } catch (err) {
      alert("Error fetching task details: " + err.message);
      setIsViewModalOpen(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      // FIX: Created payload matching exactly the desired API format
      const payload = { 
        title: editTaskForm.title, 
        priority: editTaskForm.priority.trim().toLowerCase(),
        due_date: editTaskForm.due_date,
        remarks: editTaskForm.remarks
      };
      
      if (editTaskForm.assigned_to_id) {
        payload.assigned_to_id = parseInt(editTaskForm.assigned_to_id);
      }

      await apiFetch(`/tasks/${selectedTask.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      // Update UI and refresh
      setSelectedTask({ ...selectedTask, ...payload });
      setIsEditMode(false);
      fetchAllData();
    } catch (err) {
      alert("Error updating task: " + err.message);
    }
  };

  const handleUpdateStatus = async (statusType) => {
    try {
      let payload = { status: statusType, remarks: `Status updated to ${statusType}` };
      if (statusType === 'delayed') {
        const reason = prompt("Enter delay reason:");
        if (!reason) return;
        payload.delay_reason = reason;
      }
      
      await apiFetch(`/tasks/${selectedTask.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setSelectedTask({ ...selectedTask, status: statusType });
      fetchAllData();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiFetch(`/tasks/${selectedTask.id}`, { method: 'DELETE' });
      setIsViewModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert("Error deleting task: " + err.message);
    }
  };

  // --- STATS CALCULATIONS ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status?.toLowerCase() === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status?.toLowerCase() === 'in_progress').length;
  const waitingTasks = tasks.filter(t => t.status?.toLowerCase() === 'waiting').length;
  const notStartedTasks = tasks.filter(t => !t.status || t.status?.toLowerCase() === 'not_started').length;
  const overdueCount = overdueTasks.length;

  const taskStatsList = [
    { title: 'Total Tasks', value: totalTasks, icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'up' },
    { title: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: 'up' },
    { title: 'In Progress', value: inProgressTasks, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', trend: 'up' },
    { title: 'Waiting', value: waitingTasks, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50', trend: 'down' },
    { title: 'Overdue', value: overdueCount, icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-50', trend: 'down' },
  ];

  const pieChartData = [
    { name: 'Completed', value: completedTasks || 1, color: '#10b981' },
    { name: 'In Progress', value: inProgressTasks || 1, color: '#3b82f6' },
    { name: 'Waiting', value: waitingTasks || 1, color: '#eab308' },
    { name: 'Not Started', value: notStartedTasks || 1, color: '#9ca3af' },
    { name: 'Delayed', value: tasks.filter(t => t.status?.toLowerCase() === 'delayed').length || 1, color: '#ef4444' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage, assign, and track progress.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> New Task
        </button>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {taskStatsList.map((stat, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <h4 className="text-sm font-medium text-gray-500">{stat.title}</h4>
            </div>
            <div className="flex items-end justify-between">
              <h2 className="text-3xl font-bold text-gray-900">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* --- MAIN CONTENT SPLIT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Data Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:col-span-2">
          <div className="border-b border-gray-100 px-2 flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search tasks..." className="pl-9 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {isLoading ? (
               <div className="flex items-center justify-center h-48 text-gray-500">Loading tasks...</div>
            ) : tasks.length === 0 ? (
               <div className="flex items-center justify-center h-48 text-gray-500">No tasks found. Create your first task!</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-white border-b border-gray-100 font-medium">
                  <tr>
                    <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-gray-300 text-blue-600" /></th>
                    <th className="px-4 py-4 font-semibold text-gray-700">Task Name</th>
                    <th className="px-4 py-4 font-semibold text-gray-700">Priority</th>
                    <th className="px-4 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-4 font-semibold text-gray-700">Due Date</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => handleViewTask(task.id)} className="hover:bg-blue-50/50 transition-colors bg-white group cursor-pointer">
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 w-48 truncate">{task.description}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{task.due_date || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Widgets */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-6">Tasks by Status</h3>
            <div className="flex items-center justify-between">
              <div className="w-1/2 relative h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 pl-4 space-y-3">
                {pieChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Overdue Tasks ({overdueCount})</h3>
            </div>
            <div className="space-y-4">
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No overdue tasks. Great job!</p>
              ) : overdueTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-red-500 bg-red-50">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 truncate w-32">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">ID: #{task.id}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-red-500">{task.due_date}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- CREATE TASK MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative my-8">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input type="text" required value={newTaskForm.title} onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                <select required value={newTaskForm.project_id} onChange={(e) => setNewTaskForm({...newTaskForm, project_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white">
                  <option value="" disabled>Choose a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To User</label>
                <select required value={newTaskForm.assigned_to_id} onChange={(e) => setNewTaskForm({...newTaskForm, assigned_to_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white">
                  <option value="" disabled>Choose a user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={newTaskForm.priority} onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" required value={newTaskForm.due_date} onChange={(e) => setNewTaskForm({...newTaskForm, due_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
                  <input type="time" required value={newTaskForm.due_time} onChange={(e) => setNewTaskForm({...newTaskForm, due_time: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"/>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required rows="2" value={newTaskForm.description} onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"></textarea>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <input type="text" value={newTaskForm.remarks} onChange={(e) => setNewTaskForm({...newTaskForm, remarks: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"/>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{isCreating ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW & EDIT TASK MODAL --- */}
      {isViewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            
            <div className="flex items-center gap-3 mb-6 pr-8">
              {isEditMode ? (
                <input type="text" value={editTaskForm.title} onChange={(e) => setEditTaskForm({...editTaskForm, title: e.target.value})} className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none w-full bg-transparent" />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              {!isEditMode ? (
                <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"><Edit2 className="w-4 h-4" /> Edit</button>
              ) : (
                <button onClick={handleUpdateTask} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"><Save className="w-4 h-4" /> Save</button>
              )}
              <button onClick={handleDeleteTask} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-sm font-medium transition-colors"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selectedTask.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Priority</p>
                {isEditMode ? (
                  <select value={editTaskForm.priority} onChange={(e) => setEditTaskForm({...editTaskForm, priority: e.target.value})} className="border rounded px-2 py-1.5 w-full text-sm outline-none bg-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                ) : <PriorityBadge priority={selectedTask.priority} />}
              </div>
              
              {/* FIX: Assigned User Dropdown in Edit Mode */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assigned To</p>
                {isEditMode ? (
                  <select 
                    value={editTaskForm.assigned_to_id} 
                    onChange={(e) => setEditTaskForm({...editTaskForm, assigned_to_id: e.target.value})} 
                    className="border rounded px-2 py-1.5 w-full text-sm outline-none bg-white"
                  >
                    <option value="" disabled>Select User</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    {users.find(u => u.id === selectedTask.assigned_to_id)?.name || selectedTask.assigned_to || `User #${selectedTask.assigned_to_id}`}
                  </p>
                )}
              </div>
              
              {/* FIX: Due Date input in Edit Mode */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                {isEditMode ? (
                  <input 
                    type="date" 
                    value={editTaskForm.due_date} 
                    onChange={(e) => setEditTaskForm({...editTaskForm, due_date: e.target.value})} 
                    className="border rounded px-2 py-1.5 w-full text-sm outline-none" 
                  />
                ) : (
                  <p className="font-medium text-gray-900 flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400"/> {selectedTask.due_date}</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Description</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg leading-relaxed border border-gray-100">{selectedTask.description || 'No description provided.'}</p>
            </div>

            {/* FIX: Remarks Input added for Edit Mode */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Remarks</h3>
              {isEditMode ? (
                <input 
                  type="text" 
                  value={editTaskForm.remarks} 
                  onChange={(e) => setEditTaskForm({...editTaskForm, remarks: e.target.value})} 
                  placeholder="Add update remarks..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg leading-relaxed border border-gray-100">
                  {selectedTask.remarks || 'No remarks added.'}
                </p>
              )}
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Update Task Progress</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleUpdateStatus('not_started')} className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300">Not Started</button>
                <button onClick={() => handleUpdateStatus('waiting')} className="px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600">Waiting</button>
                <button onClick={() => handleUpdateStatus('in_progress')} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">In Progress</button>
                <button onClick={() => handleUpdateStatus('completed')} className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600">Completed</button>
                <button onClick={() => handleUpdateStatus('delayed')} className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600">Delayed</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}