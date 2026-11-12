"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Search, Users, X, Check,
  AlertCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { BASE_URL } from '@/lib/api';

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '');

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map(d => d.message).join(', ') : data.detail;
    throw new Error(detail || 'Request failed');
  }
  return data;
}

export default function DepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [userCounts, setUserCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null); // { type, message }

  // Add
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [deps, users] = await Promise.all([
        api('/departments'),
        api('/users').catch(() => [])
      ]);
      setDepartments(Array.isArray(deps) ? deps : []);
      const counts = {};
      (Array.isArray(users) ? users : []).forEach(u => {
        const id = u.department?.id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      setUserCounts(counts);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? departments.filter(d => d.name.toLowerCase().includes(q)) : departments;
  }, [departments, search]);

  // --- CREATE ---
  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 2) {
      showFeedback('error', 'Department name must be at least 2 characters.');
      return;
    }
    setIsAdding(true);
    try {
      const created = await api('/departments', { method: 'POST', body: JSON.stringify({ name }) });
      setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      showFeedback('success', `Department "${created.name}" created.`);
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // --- UPDATE ---
  const startEdit = (dept) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (dept) => {
    const name = editName.trim();
    if (name === dept.name) { cancelEdit(); return; }
    if (name.length < 2) {
      showFeedback('error', 'Department name must be at least 2 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api(`/departments/${dept.id}`, { method: 'PUT', body: JSON.stringify({ name }) });
      setDepartments(prev => prev.map(d => (d.id === dept.id ? updated : d)).sort((a, b) => a.name.localeCompare(b.name)));
      cancelEdit();
      showFeedback('success', `Department renamed to "${updated.name}".`);
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api(`/departments/${deleteTarget.id}`, { method: 'DELETE' });
      setDepartments(prev => prev.filter(d => d.id !== deleteTarget.id));
      showFeedback('success', res.message || 'Department deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showFeedback('error', err.message);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Departments</h2>
            <p className="text-sm text-gray-500">Create, rename or delete the departments users can be assigned to.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5"
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Feedback */}
        {feedback && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-sm font-medium ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Add form + search */}
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleAdd} className="flex gap-2 flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={150}
              placeholder="New department name, e.g. Human Resources"
              className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={isAdding || !newName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60 shrink-0"
            >
              {isAdding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </form>
          <div className="relative md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_120px_110px] bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Department</span>
            <span className="text-center">Users</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {search ? 'No departments match your search.' : 'No departments yet. Add your first one above.'}
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
              {filtered.map(dept => {
                const count = userCounts[dept.id] || 0;
                const isEditing = editingId === dept.id;
                return (
                  <li key={dept.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_110px] items-center gap-2 px-4 py-3 hover:bg-gray-50/60">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        maxLength={150}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(dept);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 min-w-0"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400 shrink-0" /> {dept.name}
                        <span className="sm:hidden text-xs text-gray-400 font-normal">· {count} users</span>
                      </span>
                    )}

                    <span className="hidden sm:flex justify-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        count ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        <Users size={12} /> {count}
                      </span>
                    </span>

                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSave(dept)}
                            disabled={isSaving}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
                            title="Save"
                          >
                            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button type="button" onClick={cancelEdit} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Cancel">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(dept)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Rename">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget({ ...dept, count })} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-xs text-gray-400">{departments.length} departments total</p>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete department?</h3>
                {deleteTarget.count > 0 ? (
                  <p className="text-sm text-red-600 mt-1">
                    <strong>{deleteTarget.name}</strong> has {deleteTarget.count} {deleteTarget.count === 1 ? 'user' : 'users'} assigned. Move them to another department before deleting it.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl">
                Cancel
              </button>
              {deleteTarget.count === 0 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-70"
                >
                  {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
