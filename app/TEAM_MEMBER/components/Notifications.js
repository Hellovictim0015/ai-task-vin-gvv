"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, MessageSquare, Clock, ListChecks, 
  RefreshCw, CheckCircle2, AlertCircle, CalendarDays, Users, ChevronDown
} from 'lucide-react'; // Added ChevronDown
import { BASE_URL } from '@/lib/api';
export default function NotificationCenter() {
  // --- STATE ---
  const [history, setHistory] = useState([]);
  const [limit, setLimit] = useState(50);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // NEW: Users List State
  const [users, setUsers] = useState([]);

  // Broadcast Form State
  const [broadcastTarget, setBroadcastTarget] = useState('ALL'); // 'ALL' | 'SPECIFIC'
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // UPDATED: Changed from string to array for checkbox selection
  const [selectedUserIds, setSelectedUserIds] = useState([]); 
  const [showUserDropdown, setShowUserDropdown] = useState(false); // Dropdown toggle state
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Automation Loading States
  const [isSendingEod, setIsSendingEod] = useState(false);
  const [isSendingTask, setIsSendingTask] = useState(false);

  // Feedback State
  const [feedback, setFeedback] = useState(null);

  // --- API HELPER ---
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // --- 1. FETCH NOTIFICATION HISTORY & USERS ---
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${BASE_URL}/notifications/history?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Could not load notification history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // NEW: Fetch Users API
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  useEffect(() => {
    fetchUsers(); // Initial load par users fetch karein
  }, []);

  // --- NEW: Toggle User Selection ---
  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // --- 2. SEND BROADCAST ---
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setIsBroadcasting(true);
    try {
      let finalUserIds = null;

      // Agar 'SPECIFIC' select kiya hai, toh array pass karein
      if (broadcastTarget === 'SPECIFIC') {
        if (selectedUserIds.length > 0) {
          finalUserIds = selectedUserIds;
        } else {
          throw new Error("Please select at least one user from the dropdown.");
        }
      }

      const payload = {
        message: broadcastMessage,
        user_ids: finalUserIds
      };

      const response = await fetch(`${BASE_URL}/notifications/broadcast`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Broadcast failed');
      const data = await response.json();
      
      showFeedback('success', `Broadcast complete! Sent: ${data.sent}, Failed: ${data.failed}`);
      
      // Reset Form
      setBroadcastMessage('');
      setSelectedUserIds([]);
      setShowUserDropdown(false);
      setBroadcastTarget('ALL');
      fetchHistory(); // Refresh table
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // --- 3. TRIGGER EOD REMINDERS ---
  const handleTriggerEod = async () => {
    setIsSendingEod(true);
    try {
      const response = await fetch(`${BASE_URL}/notifications/send-eod-reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to trigger EOD reminders');
      const data = await response.json();
      showFeedback('success', data.message);
      fetchHistory();
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsSendingEod(false);
    }
  };

  // --- 4. TRIGGER TASK REMINDERS ---
  const handleTriggerTasks = async () => {
    setIsSendingTask(true);
    try {
      const response = await fetch(`${BASE_URL}/notifications/send-task-reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error('Failed to trigger Task reminders');
      const data = await response.json();
      showFeedback('success', data.message);
      fetchHistory();
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsSendingTask(false);
    }
  };

  // --- HELPERS ---
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Sent</span>;
      case 'failed':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 w-max"><AlertCircle size={12}/> Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded-md text-xs font-semibold w-max capitalize">{status}</span>;
    }
  };

  const getTypeBadge = (type) => {
    const formatted = type?.replace('_', ' ') || 'Unknown';
    if (type === 'eod_reminder') return <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs font-semibold capitalize">{formatted}</span>;
    if (type === 'task_reminder') return <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-semibold capitalize">{formatted}</span>;
    if (type === 'broadcast') return <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-semibold capitalize">{formatted}</span>;
    return <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-semibold capitalize">{formatted}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm"><Bell size={24} /></div>
            Notification Center
          </h1>
          <p className="text-gray-500 text-sm mt-2 ml-14">Broadcast messages and manage automated reminders.</p>
        </div>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5" /> : <AlertCircle className="mt-0.5" />}
            <div className="text-sm font-medium">{feedback.message}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: ACTIONS & BROADCAST */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Quick Automations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw size={18} className="text-blue-600" /> Quick Automations
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={handleTriggerEod}
                  disabled={isSendingEod}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-colors group disabled:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600"><Clock size={18}/></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-purple-900">Trigger EOD Reminders</p>
                      <p className="text-xs text-purple-700/70">Send to all pending users</p>
                    </div>
                  </div>
                  {isSendingEod ? <RefreshCw size={16} className="animate-spin text-purple-600" /> : <Send size={16} className="text-purple-400 group-hover:text-purple-600" />}
                </button>

                <button 
                  onClick={handleTriggerTasks}
                  disabled={isSendingTask}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group disabled:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600"><ListChecks size={18}/></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-blue-900">Trigger Task Reminders</p>
                      <p className="text-xs text-blue-700/70">Send pending task alerts</p>
                    </div>
                  </div>
                  {isSendingTask ? <RefreshCw size={16} className="animate-spin text-blue-600" /> : <Send size={16} className="text-blue-400 group-hover:text-blue-600" />}
                </button>
              </div>
            </div>

            {/* Custom Broadcast */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" /> Custom Broadcast
              </h2>
              <p className="text-xs text-gray-500 mb-5">Send a custom push/message to your team.</p>

              <form onSubmit={handleBroadcast} className="space-y-5">
                
                {/* Audience Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Target Audience</label>
                  <div className="flex flex-col gap-2.5">
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${broadcastTarget === 'ALL' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="target" 
                        value="ALL"
                        checked={broadcastTarget === 'ALL'} 
                        onChange={() => { setBroadcastTarget('ALL'); setSelectedUserIds([]); setShowUserDropdown(false); }} 
                        className="w-4 h-4 text-blue-600" 
                      />
                      <span className="text-sm font-medium text-gray-900">All Team Members</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${broadcastTarget === 'SPECIFIC' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="target" 
                        value="SPECIFIC"
                        checked={broadcastTarget === 'SPECIFIC'} 
                        onChange={() => setBroadcastTarget('SPECIFIC')} 
                        className="w-4 h-4 text-blue-600" 
                      />
                      <span className="text-sm font-medium text-gray-900">Specific Users Only</span>
                    </label>
                  </div>
                </div>

                {/* --- NEW: User Checkbox Dropdown (Only shows if SPECIFIC is chosen) --- */}
                {broadcastTarget === 'SPECIFIC' && (
                  <div className="relative animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Users <span className="text-red-500">*</span></label>
                    
                    {/* Dropdown Toggle Button */}
                    <div 
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white cursor-pointer flex justify-between items-center hover:border-blue-500 transition-colors shadow-sm"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                    >
                      <span className={selectedUserIds.length ? "text-gray-900 font-medium" : "text-gray-400"}>
                        {selectedUserIds.length > 0 
                          ? `${selectedUserIds.length} User(s) Selected` 
                          : "Select users..."}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Dropdown List */}
                    {showUserDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {users.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500 text-center">No users found.</div>
                        ) : (
                          users.map(user => (
                            <label 
                              key={user.id} 
                              className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                            >
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                              />
                              <div className="flex justify-between items-center w-full">
                                <div>
                                  <span className="font-medium text-gray-900 text-sm block">{user.name}</span>
                                  <span className="text-xs text-gray-400 block">{user.email}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide">
                                  {user.department?.name || 'No Dept'}
                                </span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Message Content</label>
                  <textarea 
                    required
                    rows="3"
                    placeholder="Type your broadcast message here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none shadow-sm"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isBroadcasting}
                  className="w-full bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl text-sm font-medium shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                >
                  {isBroadcasting ? (
                    <><RefreshCw size={16} className="animate-spin" /> Broadcasting...</>
                  ) : (
                    <><Send size={16} /> Send Message Now</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: NOTIFICATION HISTORY */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2 min-h-[600px] overflow-hidden">
            
            {/* History Header */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notification History</h2>
                <p className="text-sm text-gray-500 mt-0.5">Logs of all automated and manual messages.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button onClick={fetchHistory} className="p-2 text-gray-500 hover:bg-white rounded-lg border border-gray-200 shadow-sm transition-colors hover:text-blue-600" title="Refresh">
                  <RefreshCw size={16} className={isLoadingHistory ? "animate-spin text-blue-600" : ""} />
                </button>
                <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Show:</span>
                  <select 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="text-sm font-medium text-gray-900 outline-none bg-transparent cursor-pointer"
                  >
                    <option value={50}>Last 50</option>
                    <option value={100}>Last 100</option>
                    <option value={500}>Last 500</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-500 tracking-wide text-xs uppercase">Target</th>
                    <th className="px-6 py-4 font-bold text-gray-500 tracking-wide text-xs uppercase">Type & Channel</th>
                    <th className="px-6 py-4 font-bold text-gray-500 tracking-wide text-xs uppercase w-full">Message Snippet</th>
                    <th className="px-6 py-4 font-bold text-gray-500 tracking-wide text-xs uppercase">Status</th>
                    <th className="px-6 py-4 font-bold text-gray-500 tracking-wide text-xs uppercase">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-gray-500 font-medium">Loading message history...</p>
                        </div>
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 text-gray-400">
                          <div className="bg-gray-50 p-4 rounded-full">
                            <MessageSquare size={32} className="text-gray-300" />
                          </div>
                          <p className="font-semibold text-gray-900">No logs found</p>
                          <p className="text-sm">There is no notification history available.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-50 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200 shadow-sm">
                              U{item.user_id || 'A'}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {item.user_id ? `User #${item.user_id}` : 'All Users'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {getTypeBadge(item.notification_type)}
                            <span className="text-xs text-gray-500 font-medium tracking-wide uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> {item.channel || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs md:max-w-sm lg:max-w-xs xl:max-w-md truncate text-gray-700 font-medium" title={item.message}>
                            {item.message}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <CalendarDays size={14} className="text-gray-400" />
                            {formatDateTime(item.sent_at)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}