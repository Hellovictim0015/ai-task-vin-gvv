"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Shield, Plus, Edit2, ChevronRight,
    Settings, Trash2, X, Building2, Users
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';

// --- API HELPER ---
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

const apiFetch = async (endpoint, options = {}) => {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

    if (!response.ok) {
        let msg = 'API request failed';
        if (responseBody?.detail) {
            msg = Array.isArray(responseBody.detail)
                ? responseBody.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n')
                : responseBody.detail;
        } else if (responseBody?.message) {
            msg = responseBody.message;
        } else if (typeof responseBody === 'string' && responseBody.trim()) {
            msg = responseBody;
        }
        throw new Error(msg);
    }
    return responseBody;
};

// --- DEPARTMENT SELECT DROPDOWN (Direct Fetch API) ---
const DepartmentSelect = ({ value, onChange, required = false, className = '' }) => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
        
        const fetchUrl = BASE_URL.endsWith('/api/v1') 
            ? `${BASE_URL}/departments` 
            : `${BASE_URL}/api/v1/departments`;

        fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            setDepartments(Array.isArray(data) ? data : []);
        })
        .catch(err => {
            console.error("Failed to load departments:", err);
            setDepartments([]);
        })
        .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Department
            </label>
            <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                    required={required}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                    className={`w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-sm appearance-none transition-all ${className}`}
                >
                    <option value="" disabled>
                        {loading ? 'Loading departments...' : 'Select Department'}
                    </option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                            {dept.name}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RoleUsersManagement() {
    // Core state
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Create user form ──────────────
    const defaultCreateForm = {
        name: '',
        phone: '',
        email: '',
        password: '',
        role: '',
        department_id: null,
    };
    const [userForm, setUserForm] = useState(defaultCreateForm);

    // ── Edit user form ────────────────
    const defaultEditForm = {
        name: '',
        department_id: null,
    };
    const [editUserForm, setEditUserForm] = useState(defaultEditForm);

    // ── Initial load ─────────────────────────────────────────────────────────
    useEffect(() => { fetchUsers(); }, []);

    // ─── FETCH ALL USERS ──────────────────────────────────────────────────────
    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await apiFetch('/users/?is_active=true');
            setUsers(Array.isArray(data) ? data : (data?.users || []));
        } catch (err) {
            console.error('fetchUsers error:', err);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── USER CRUD ────────────────────────────────────────────────────────────
    const openAddUserModal = () => {
        setUserForm(defaultCreateForm);
        setIsUserModalOpen(true);
    };

    // CREATE
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name:          userForm.name,
                phone:         userForm.phone,
                email:         userForm.email || undefined,
                password:      userForm.password,
                role:          userForm.role,
                department_id: userForm.department_id,
            };
            await apiFetch('/users/', { method: 'POST', body: JSON.stringify(payload) });
            setIsUserModalOpen(false);
            setUserForm(defaultCreateForm);
            await fetchUsers();
        } catch (err) {
            alert('Error creating user:\n' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // OPEN EDIT
    const openEditUserModal = async (id) => {
        setSelectedUserId(id);
        try {
            const data = await apiFetch(`/users/${id}`);
            setEditUserForm({
                name:          data.name,
                department_id: data.department_id ?? null,
            });
            setIsEditUserModalOpen(true);
        } catch (err) {
            alert('Error fetching user: ' + err.message);
        }
    };

    // UPDATE
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiFetch(`/users/${selectedUserId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name:          editUserForm.name,
                    department_id: editUserForm.department_id,
                }),
            });
            setIsEditUserModalOpen(false);
            await fetchUsers();
        } catch (err) {
            alert('Error updating user:\n' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // DELETE
    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;
        try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            await fetchUsers();
        } catch (err) {
            alert('Error deleting user: ' + err.message);
        }
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-50/50 min-h-screen">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Settings className="w-4 h-4" /> 
                        <span>Settings</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-gray-900 font-medium">User Directory</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users Management</h1>
                    <p className="text-gray-500 mt-1.5 text-sm">Manage your organization's users and their details.</p>
                </div>
            </div>

            {/* FULL WIDTH USERS TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Header Actions */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-white z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">All Users</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {users.length} {users.length === 1 ? 'user' : 'users'} total
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={openAddUserModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Plus size={18} /> Add User
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6 sm:p-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-3">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading users...</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50/80 border-b border-gray-200/80">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">User Details</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Contact Info</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Department</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                                        <Users className="w-10 h-10 text-gray-300 mb-3" />
                                                        <p className="font-medium text-gray-900 mb-1">No users found</p>
                                                        <p className="text-sm">There are currently no users in the directory.</p>
                                                        <button 
                                                            onClick={openAddUserModal}
                                                            className="mt-4 text-blue-600 font-medium text-sm hover:underline"
                                                        >
                                                            Add the first user
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map(user => (
                                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center text-blue-700 font-semibold text-xs border border-blue-200/50">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-gray-900">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-900">{user.email || '—'}</span>
                                                            <span className="text-gray-500 text-xs mt-0.5">{user.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80">
                                                            {user.department?.name ?? (user.department_id ? `Dept #${user.department_id}` : 'Unassigned')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => openEditUserModal(user.id)} 
                                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit User"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteUser(user.id)} 
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove User"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── ADD USER MODAL ─────────────────────────────────────────────── */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md relative shadow-xl transform transition-all">
                        <button
                            onClick={() => setIsUserModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                            <p className="text-sm text-gray-500 mt-1">Create a new user and assign them to a role.</p>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <input
                                    required type="text" placeholder="e.g. Jane Doe"
                                    value={userForm.name}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Phone</label>
                                    <input
                                        required type="text" placeholder="e.g. 919876543210"
                                        value={userForm.phone}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                        onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Password</label>
                                    <input
                                        required type="password" placeholder="••••••••"
                                        value={userForm.password}
                                        className="w-full border border-gray-200 p-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Email (Optional)</label>
                                <input
                                    type="email" placeholder="jane@company.com"
                                    value={userForm.email}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                />
                            </div>

                            {/* ── DEPARTMENT DROPDOWN ── */}
                            <DepartmentSelect
                                required={true}
                                value={userForm.department_id}
                                onChange={val => setUserForm({ ...userForm, department_id: val })}
                            />

                            {/* ROLE DROPDOWN */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                                    System Role
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        value={userForm.role}
                                        onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                        className="w-full border border-gray-200 p-2.5 pr-10 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-sm appearance-none transition-all"
                                    >
                                        <option value="" disabled>Select a role</option>
                                        {/* <option value="admin">Admin Manager</option> */}
                                        <option value="department_head">Department Head</option>
                                        <option value="team_member">Team Member</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-70 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EDIT USER MODAL ────────────────────────────────────────────── */}
            {isEditUserModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md relative shadow-xl transform transition-all">
                        <button
                            onClick={() => setIsEditUserModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
                            <p className="text-sm text-gray-500 mt-1">Update user details and departmental assignment.</p>
                        </div>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <input
                                    required type="text" placeholder="Full Name"
                                    value={editUserForm.name}
                                    className="w-full border border-gray-200 p-2.5 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                                    onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                                />
                            </div>

                            {/* ── DEPARTMENT DROPDOWN ── */}
                            <DepartmentSelect
                                value={editUserForm.department_id}
                                onChange={val => setEditUserForm({ ...editUserForm, department_id: val })}
                            />

                            <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditUserModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-70 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
