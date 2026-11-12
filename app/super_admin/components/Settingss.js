"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Key, CheckCircle2, 
  AlertCircle, Lock, CalendarDays, Building2, RefreshCw 
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';
import DepartmentManager from './DepartmentManager';
export default function AccountSettings() {
  // --- STATE ---
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // --- API HELPERS ---
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const showFeedback = (type, message) => {
    setPasswordFeedback({ type, message });
    setTimeout(() => setPasswordFeedback(null), 5000);
  };

  // --- 1. FETCH USER PROFILE ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to load profile data.');
        
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
        setProfileError(err.message);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  // --- 2. CHANGE PASSWORD HANDLER ---
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    // Client-side validation
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showFeedback('error', 'New password and confirmation do not match.');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showFeedback('error', 'New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to change password. Please check your old password.');
      }

      showFeedback('success', 'Password successfully updated! Please use your new password next time you log in.');
      
      // Reset form
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleFormChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };

  // Helper to format role visually
  const formatRole = (role) => {
    if (!role) return 'User';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50/80 p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your personal profile and security preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: PROFILE CARD */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              
              {/* Profile Header Background */}
              <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              
              {isLoadingProfile ? (
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-500 font-medium">Loading profile...</p>
                </div>
              ) : profileError ? (
                <div className="p-8 text-center text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{profileError}</p>
                </div>
              ) : profile ? (
                <div className="px-6 pb-6 relative">
                  
                  {/* Avatar */}
                  <div className="absolute -top-12 left-6 w-20 h-20 bg-white rounded-2xl p-1.5 shadow-md">
                    <div className="w-full h-full bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl font-extrabold border border-blue-200">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex justify-end pt-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 ${
                      profile.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {/* Profile Info */}
                  <div className="mt-4">
                    <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-sm font-medium text-blue-600 mt-0.5">{formatRole(profile.role)}</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                        <Mail size={16} />
                      </div>
                      <span className="truncate" title={profile.email}>{profile.email || 'No email provided'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                        <Phone size={16} />
                      </div>
                      <span>{profile.phone}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                        <Building2 size={16} />
                      </div>
                      <span>{profile.department_id ? `Department #${profile.department_id}` : 'No Department Assigned'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                        <CalendarDays size={16} />
                      </div>
                      <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            
            {/* Helpful Note */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100/50 shadow-sm">
              <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-1.5 text-sm">
                <Shield size={16} className="text-blue-500" /> Account Security
              </h3>
              <p className="text-xs text-blue-800/80 leading-relaxed font-medium">
                We recommend updating your password every 90 days. Avoid using personal information or common words in your password.
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN: CHANGE PASSWORD FORM */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              
              <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                  <p className="text-sm text-gray-500">Update your credentials to keep your account secure.</p>
                </div>
              </div>

              <div className="p-6">
                
                {/* Feedback Toast */}
                {passwordFeedback && (
                  <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                    passwordFeedback.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {passwordFeedback.type === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <AlertCircle className="mt-0.5 shrink-0" />}
                    <div className="text-sm font-medium leading-relaxed">{passwordFeedback.message}</div>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                  
                  {/* Old Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        required
                        type="password" 
                        name="old_password"
                        placeholder="Enter current password"
                        value={passwordForm.old_password}
                        onChange={handleFormChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <hr className="border-gray-100 my-4" />

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        required
                        type="password" 
                        name="new_password"
                        placeholder="Minimum 6 characters"
                        value={passwordForm.new_password}
                        onChange={handleFormChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <CheckCircle2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        required
                        type="password" 
                        name="confirm_password"
                        placeholder="Retype new password"
                        value={passwordForm.confirm_password}
                        onChange={handleFormChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                    {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                      <p className="text-xs text-red-500 font-medium mt-1.5 pl-1">Passwords do not match</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isChangingPassword}
                      className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                    >
                      {isChangingPassword ? (
                        <><RefreshCw size={16} className="animate-spin" /> Updating...</>
                      ) : (
                        <><Key size={16} /> Update Password</>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>

        </div>

        {/* DEPARTMENT MANAGEMENT (Super Admin) */}
        <DepartmentManager />
      </div>
    </div>
  );
}