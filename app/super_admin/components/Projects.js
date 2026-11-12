// src/components/Projects.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Filter, Plus, ChevronDown, Search, LayoutGrid, List, 
  MoreVertical, ClipboardList, PlayCircle, 
  CheckCircle2, PauseCircle, XCircle, Rocket, Users, Edit2, X, Save, UserPlus, Activity
} from 'lucide-react';
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
    throw new Error(err.detail || 'API request failed');
  }
  return response.json();
};

export default function Projects() {
  // Main Data States
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', project_head_id: '' });
  const [isCreating, setIsCreating] = useState(false);

  // View/Edit Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Single Project Details Data
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectTaskStats, setProjectTaskStats] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  
  // Add Member States
  const [newMemberId, setNewMemberId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchProjects();
    fetchAllUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/projects/');
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await apiFetch('/users/');
      setAllUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiFetch('/projects/', {
        method: 'POST',
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          project_head_id: parseInt(newProject.project_head_id)
        })
      });
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '', project_head_id: '' });
      fetchProjects(); 
    } catch (err) {
      alert("Error creating project: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // View Single Project (Fetches Project, Members, and Stats)
  const handleViewProject = async (id) => {
    setIsViewModalOpen(true);
    setIsEditMode(false);
    setIsLoadingDetails(true);
    
    try {
      const [projectData, membersData, statsData] = await Promise.all([
        apiFetch(`/projects/${id}`),
        apiFetch(`/projects/${id}/members`).catch(() => []), 
        apiFetch(`/dashboard/project/${id}`).catch(() => ({})) 
      ]);

      setSelectedProject(projectData);
      setEditForm({ name: projectData.name, description: projectData.description });
      setProjectMembers(Array.isArray(membersData) ? membersData : membersData.members || []);
      setProjectTaskStats(statsData);

    } catch (err) {
      alert("Failed to load project details: " + err.message);
      setIsViewModalOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Update Project
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/projects/${selectedProject.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setSelectedProject({ ...selectedProject, ...editForm }); 
      setIsEditMode(false); 
      fetchProjects(); 
    } catch (err) {
      alert("Error updating project: " + err.message);
    }
  };

  // Add Member to Project
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberId) return;
    setIsAddingMember(true);
    try {
      await apiFetch(`/projects/${selectedProject.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: parseInt(newMemberId) })
      });
      
      setNewMemberId("");
      
      const updatedMembers = await apiFetch(`/projects/${selectedProject.id}/members`);
      setProjectMembers(Array.isArray(updatedMembers) ? updatedMembers : updatedMembers.members || []);
      
    } catch (err) {
      alert("Error adding member: " + err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  // --- DYNAMIC STATS CALCULATION ---
  const totalProjects = projects.length;
  // Agar API me status nahi hai, tab default 'Active' assume kiya gaya hai
  const activeProjects = projects.filter(p => !p.status || p.status.toLowerCase() === 'active').length;
  const completedProjects = projects.filter(p => p.status?.toLowerCase() === 'completed').length;
  const holdProjects = projects.filter(p => p.status?.toLowerCase() === 'on hold').length;
  const cancelledProjects = projects.filter(p => p.status?.toLowerCase() === 'cancelled').length;

  const projectStats = [
    { title: 'Total Projects', value: totalProjects, subtitle: 'All Projects', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Active Projects', value: activeProjects, subtitle: 'Currently Running', icon: PlayCircle, color: 'text-green-500', bg: 'bg-green-50' },
    { title: 'Completed Projects', value: completedProjects, subtitle: 'Successfully Completed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'On Hold Projects', value: holdProjects, subtitle: 'Temporarily Paused', icon: PauseCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
    { title: 'Cancelled Projects', value: cancelledProjects, subtitle: 'Cancelled', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track all your projects in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4 mr-1" /> New Project
          </button>
        </div>
      </div>

      {/* DYNAMIC STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {projectStats.map((stat, index) => (
          <div key={index} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
              <h2 className="text-2xl font-bold text-gray-900 leading-none mt-1">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* PROJECTS DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ClipboardList className="w-12 h-12 mb-3 text-gray-300" />
              <p>No projects found. Create one!</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100 font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Project Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 hidden md:table-cell">Description</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Project Head</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project.id} onClick={() => handleViewProject(project.id)} className="hover:bg-blue-50/50 transition-colors bg-white cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Rocket className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900 whitespace-nowrap">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-gray-500 w-64 truncate">
                      {project.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium capitalize">
                      {project.project_head?.name || `User #${project.project_head_id}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200 capitalize">
                        {project.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- CREATE PROJECT MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Name</label>
                <input type="text" required value={newProject.name} onChange={(e) => setNewProject({...newProject, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Head</label>
                <select required value={newProject.project_head_id} onChange={(e) => setNewProject({...newProject, project_head_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white">
                  <option value="" disabled>Select a Head User</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea required rows="3" value={newProject.description} onChange={(e) => setNewProject({...newProject, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW & EDIT SINGLE PROJECT MODAL --- */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading details...</p>
              </div>
            ) : selectedProject && (
              <>
                {/* Header */}
                <div className="flex items-center gap-4 mb-8 pr-8 border-b border-gray-100 pb-6">
                  <div className="w-16 h-16 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Rocket className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    {isEditMode ? (
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full mb-1" />
                    ) : (
                      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{selectedProject.name}</h2>
                    )}
                    <p className="text-sm font-medium text-gray-500 mt-1 capitalize">
                      Project ID: #{selectedProject.id} • Head: {selectedProject.project_head?.name || `User #${selectedProject.project_head_id}`}
                    </p>
                  </div>
                  {!isEditMode ? (
                    <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"><Edit2 className="w-4 h-4" /> Edit</button>
                  ) : (
                    <button onClick={handleUpdateProject} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"><Save className="w-4 h-4" /> Save</button>
                  )}
                </div>

                {/* Task Stats Box */}
                <div className="bg-white p-2">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">Task Overview</h3>
                  </div>
                  
                  {projectTaskStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(projectTaskStats).filter(([key]) => key !== 'project_id').map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center shadow-sm hover:border-indigo-100 transition-colors">
                          <p className="text-3xl font-black text-gray-900">{value}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-2">{key.replace(/_/g, ' ')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">No task data available.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}