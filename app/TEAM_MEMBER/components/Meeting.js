"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Clock, MapPin, 
  ChevronRight, Sparkles, X, Users, FileText, Link as LinkIcon
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

  // View Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  // Fetch & View Single Meeting
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
    <div className="max-w-[1000px] mx-auto p-4 md:p-8 font-sans bg-gray-50/30 min-h-screen">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meeting History</h1>
          <p className="text-gray-500 mt-1 text-sm">Meeting records, notes, AI summaries, and generated action items.</p>
        </div>
      </div>

      {/* --- MAIN CONTENT: Meetings List --- */}
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
              <input type="text" placeholder="Search meetings..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
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

      {/* --- VIEW MEETING DETAILS MODAL --- */}
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
                {/* Modal Header */}
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
                

                  {/* Notes / Agenda */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" /> Notes & Agenda
                    </h3>
                    <div className="bg-gray-50 text-gray-700 p-4 rounded-xl leading-relaxed border border-gray-100 text-sm whitespace-pre-wrap">
                      {selectedMeeting.raw_notes || "No notes available for this meeting."}
                    </div>
                  </div>

                  {/* AI Summary / AI Decisions */}
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