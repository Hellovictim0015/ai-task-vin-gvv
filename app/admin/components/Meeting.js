"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, Clock, MapPin, Plus, 
  ChevronRight, ChevronLeft, ChevronDown, Sparkles, X, Users, FileText, Link as LinkIcon
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';

// --- API HELPER FUNCTION ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

const apiFetch = async (endpoint, options = {}) => {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  
  const response = await fetch(`${cleanBaseUrl}/${cleanEndpoint}`, {
    ...options,
    headers: { 
      'Authorization': `Bearer ${getToken()}`, 
      'Content-Type': 'application/json',
      ...options.headers 
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    let errorMessage = 'API request failed';
    if (err.detail) {
      errorMessage = Array.isArray(err.detail) ? err.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n') : err.detail;
    } else if (err.message) {
      errorMessage = err.message;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export default function Meetings() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  
  // States
  const [meetings, setMeetings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false); 

  // --- NEW: View Modal States ---
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', project_id: '', meeting_date: '', meeting_time: '',
    participants: [], meeting_link: '', raw_notes: ''
  });

  // Initial Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [meetingsData, projectsData, usersData] = await Promise.all([
        apiFetch('/meetings/').catch(() => []),
        apiFetch('/projects/').catch(() => []),
        apiFetch('/users').catch(() => []) 
      ]);
      
      setMeetings(Array.isArray(meetingsData) ? meetingsData : (meetingsData.meetings || []));
      setProjects(Array.isArray(projectsData) ? projectsData : (projectsData.projects || []));
      setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setFormData((prev) => {
      const isSelected = prev.participants.includes(userId);
      if (isSelected) {
        return { ...prev, participants: prev.participants.filter(id => id !== userId) };
      } else {
        return { ...prev, participants: [...prev.participants, userId] };
      }
    });
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (formData.participants.length === 0) {
      alert("Please select at least one participant.");
      return;
    }
    setIsSubmitting(true);
    try {
      const formattedTime = formData.meeting_time.length === 5 
        ? `${formData.meeting_time}:00` 
        : formData.meeting_time;

      const payload = {
        title: formData.title, project_id: parseInt(formData.project_id),
        meeting_date: formData.meeting_date, meeting_time: formattedTime,
        meeting_link: formData.meeting_link, participants: formData.participants, 
        raw_notes: formData.raw_notes
      };

      await apiFetch('/meetings/', { method: 'POST', body: JSON.stringify(payload) });

      setFormData({ title: '', project_id: '', meeting_date: '', meeting_time: '', participants: [], meeting_link: '', raw_notes: '' });
      setShowUserDropdown(false);
      alert("Meeting scheduled successfully!");
      fetchInitialData();
    } catch (err) {
      alert("Error scheduling meeting:\n" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSummary = async (e, meetingId) => {
    e.stopPropagation(); // Prevents opening the view modal when clicking AI button
    try {
      await apiFetch(`/meetings/${meetingId}/generate-summary`, { method: 'POST' });
      alert("AI Summary generation started!");
      fetchInitialData();
      
      // If modal is open for this meeting, refresh its data too
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        handleViewMeeting(meetingId);
      }
    } catch (err) {
      alert("Error generating summary: " + err.message);
    }
  };

  // --- NEW: Fetch & View Single Meeting ---
  const handleViewMeeting = async (id) => {
    setIsViewModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const data = await apiFetch(`/meetings/${id}`);
      setSelectedMeeting(data);
    } catch (err) {
      alert("Error fetching meeting details: " + err.message);
      setIsViewModalOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // --- FILTER LOGIC ---
  const now = new Date();
  const upcomingMeetings = meetings.filter(m => {
    if (!m.meeting_date) return false;
    const meetingDateTime = new Date(`${m.meeting_date}T${m.meeting_time || '00:00:00'}`);
    return meetingDateTime >= now;
  });
  const completedMeetings = meetings.filter(m => {
    if (!m.meeting_date) return true;
    const meetingDateTime = new Date(`${m.meeting_date}T${m.meeting_time || '00:00:00'}`);
    return meetingDateTime < now;
  });
  const displayMeetings = activeTab === 'Upcoming' ? upcomingMeetings : activeTab === 'Completed' ? completedMeetings : meetings;

  // Helper to get Project Name
  const getProjectName = (id) => {
    const proj = projects.find(p => p.id === id);
    return proj ? proj.name : `Project #${id}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-sans bg-gray-50/30 min-h-screen">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1 text-sm">Meeting records, notes, AI summaries, and generated action items.</p>
        </div>
      </div>

      {/* --- MAIN GRID --- */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        
        {/* LEFT COLUMN: Meetings List */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex gap-6">
              {['Upcoming', 'Completed', 'All Meetings'].map(tab => (
                <button 
                  key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-4 -mb-[17px] text-sm font-semibold transition-colors relative ${activeTab === tab ? 'text-[#0f52ba]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f52ba] rounded-t-full" />}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search meetings..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-gray-500 text-center py-8">Loading meetings...</p>
            ) : displayMeetings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No {activeTab.toLowerCase()} meetings found.</p>
            ) : (
              displayMeetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  onClick={() => handleViewMeeting(meeting.id)} 
                  className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-200 cursor-pointer transition-colors group ${activeTab === 'Completed' ? 'opacity-80 hover:opacity-100' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-gray-900">{meeting.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <p className="text-sm text-gray-500">{getProjectName(meeting.project_id)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 mt-3">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400"/> {meeting.meeting_date}</span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> {meeting.meeting_time}</span>
                        {meeting.meeting_link && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1.5 text-blue-500"><MapPin size={14}/> Virtual Link</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleGenerateSummary(e, meeting.id)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                        title="Generate AI Summary"
                      >
                        <Sparkles size={18} />
                      </button>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide ${activeTab === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#0f52ba]'}`}>
                        View Details
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Schedule Form */}
        <div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-6">
            <h2 className="font-bold text-xl text-gray-900 mb-1">Schedule New Meeting</h2>
            <p className="text-sm text-gray-500 mb-6">Fill in the details to schedule a new meeting.</p>
            
            <form onSubmit={handleCreateMeeting} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter meeting title" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project <span className="text-red-500">*</span></label>
                  <select required value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="" disabled>Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
                  <input required type="date" value={formData.meeting_date} onChange={e => setFormData({...formData, meeting_date: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time <span className="text-red-500">*</span></label>
                <input required type="time" value={formData.meeting_time} onChange={e => setFormData({...formData, meeting_time: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-600" />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Participants <span className="text-red-500">*</span></label>
                <div className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white cursor-pointer flex justify-between items-center hover:border-blue-500 transition-colors" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                  <span className={formData.participants.length ? "text-gray-900 font-medium" : "text-gray-400"}>
                    {formData.participants.length > 0 ? `${formData.participants.length} Participant(s) Selected` : "Select participants..."}
                  </span>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {users.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">No users found.</div>
                    ) : (
                      users.map(user => (
                        <label key={user.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                          <input type="checkbox" className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" checked={formData.participants.includes(user.id)} onChange={() => toggleUserSelection(user.id)} />
                          <div className="flex justify-between items-center w-full">
                            <div><span className="font-medium text-gray-900 text-sm block">{user.name}</span><span className="text-xs text-gray-400 block">{user.email}</span></div>
                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide">{user.department?.name || 'No Dept'}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meeting Link</label>
                <input type="url" value={formData.meeting_link} onChange={e => setFormData({...formData, meeting_link: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-600 bg-gray-50/50" placeholder="https://meet.google.com/xxx-xxxx-xxx" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Agenda</label>
                <textarea value={formData.raw_notes} onChange={e => setFormData({...formData, raw_notes: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y" rows={4} placeholder="Add agenda, discussion points or notes..."></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#0f52ba] hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-70">
                  {isSubmitting ? 'Scheduling...' : 'Create Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* --- NEW: VIEW MEETING DETAILS MODAL --- */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading details...</p>
              </div>
            ) : selectedMeeting && (
              <>
                {/* Header */}
                <div className="flex items-start gap-4 mb-8 pr-8 border-b border-gray-100 pb-6">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{selectedMeeting.title}</h2>
                    <p className="text-sm font-medium text-blue-600 mt-1">{getProjectName(selectedMeeting.project_id)}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <Calendar size={16} className="text-gray-400" /> {selectedMeeting.meeting_date}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <Clock size={16} className="text-gray-400" /> {selectedMeeting.meeting_time}
                      </div>
                      {selectedMeeting.meeting_link && (
                        <a href={selectedMeeting.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-semibold bg-blue-50 px-2.5 py-1 rounded-md">
                          <LinkIcon size={14} /> Join Virtual Meeting
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Participants Section */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" /> Participants
                    </h3>
                    {selectedMeeting.participants?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedMeeting.participants.map(pId => {
                          const user = users.find(u => u.id === pId);
                          return (
                            <span key={pId} className="px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg border border-gray-200">
                              {user ? user.name : `User #${pId}`}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic bg-gray-50 p-3 rounded-lg border border-gray-100">No participants specified.</p>
                    )}
                  </div>

                  {/* Notes / Agenda */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" /> Notes & Agenda
                    </h3>
                    <div className="bg-gray-50 text-gray-700 p-4 rounded-xl leading-relaxed border border-gray-100 text-sm whitespace-pre-wrap">
                      {selectedMeeting.raw_notes || "No notes available for this meeting."}
                    </div>
                  </div>

                  {/* AI Summary / AI Decisions (If generated) */}
                  {(selectedMeeting.ai_summary || selectedMeeting.key_decisions) && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-2xl border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-bold text-gray-900">AI Generated Insights</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedMeeting.ai_summary && (
                          <div>
                            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">Summary</h4>
                            <p className="text-gray-800 text-sm leading-relaxed">{selectedMeeting.ai_summary}</p>
                          </div>
                        )}
                        {selectedMeeting.key_decisions && (
                          <div>
                            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">Key Decisions</h4>
                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{selectedMeeting.key_decisions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Details Footer */}
                  <div className="pt-4 border-t border-gray-100 text-xs font-medium text-gray-400 text-right">
                    Meeting ID: #{selectedMeeting.id} | Created: {new Date(selectedMeeting.created_at).toLocaleString()}
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}