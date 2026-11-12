"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Plus, Eye, Send, Calendar, Clock, LayoutList
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';
const NO_PROJECT_ASSIGNED = 'No Project Assigned';

export default function MyEOD() {
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Submit EOD Form states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultEodForm = {
    project_id: '', completed_work: '', pending_work: '', delay_reason: '', tomorrow_plan: '', support_required: ''
  };
  const [eodForm, setEodForm] = useState(defaultEodForm);

  // --- HELPER: FORMAT EOD ITEM ---
  const formatEodItem = (item) => ({
    id: `my_${item.id}`,
    projectName: item.project?.name || (item.project_id ? `Project #${item.project_id}` : NO_PROJECT_ASSIGNED),
    date: new Date(item.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Submitted',
    progress: item.pending_work ? 50 : (!item.completed_work ? 0 : 100),
    time: new Date(item.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  });

  // --- FETCH PROJECTS ---
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

  // --- FETCH MY REPORTS ---
  const fetchMyReports = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const response = await fetch(`${BASE_URL}/eod/my-reports`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      const formattedData = data.map(item => formatEodItem(item));
      setReports(formattedData);
    } catch (err) { 
      console.error("Error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // --- SUBMIT EOD FORM HANDLER ---
  const handleSubmitEOD = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
      const payload = { ...eodForm, project_id: eodForm.project_id ? parseInt(eodForm.project_id) : null };

      const response = await fetch(`${BASE_URL}/eod/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || errorBody.message || 'Failed to submit EOD');
      }
      setIsSubmitModalOpen(false); 
      setEodForm(defaultEodForm);
      fetchMyReports(); // Refresh the list after submission
    } catch (err) { 
      alert("Error submitting EOD: " + err.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  useEffect(() => { 
    fetchProjects(); 
    fetchMyReports(); 
  }, []);

  const hasAssignedProjects = projects.length > 0;

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-8 font-sans text-gray-900 relative">
      <div className="max-w-[1000px] mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">My EOD Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Track your daily progress and accomplishments.</p>
          </div>
          
          <button 
            onClick={() => setIsSubmitModalOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus size={18} /> Submit Today's EOD
          </button>
        </div>

        {/* SUMMARY STATS (Optional clean look) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Total Submitted</p>
              <h3 className="text-2xl font-bold text-gray-900">{reports.length}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600"><LayoutList size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Active Projects</p>
              <h3 className="text-2xl font-bold text-gray-900">{projects.length}</h3>
            </div>
          </div>
        </div>

        {/* MAIN DATA TABLE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h3 className="font-semibold text-gray-700">Submission History</h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Project Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Progress</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center"><div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-500">No EOD reports submitted yet.</td></tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-gray-900">{report.projectName}</td>
                      <td className="px-6 py-4 text-gray-600 flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> {report.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border-green-100">
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 w-32">
                          <span className="font-semibold text-gray-700">{report.progress}%</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full">
                            <div className={`h-full rounded-full ${report.progress === 100 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${report.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 transition-colors">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- SUBMIT EOD MODAL --- */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
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
                  {hasAssignedProjects ? (
                    <select
                      required
                      value={eodForm.project_id}
                      onChange={(e) => setEodForm({...eodForm, project_id: e.target.value})}
                      className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                    >
                      <option value="" disabled>Select a project...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm bg-gray-50 text-gray-600">
                      {NO_PROJECT_ASSIGNED}
                    </div>
                  )}
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
