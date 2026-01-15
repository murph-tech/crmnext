'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Pencil, Trash2, X, Loader2, Save, Mail, Lock, User, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface UserData {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    createdAt: string;
    _count?: {
        leads: number;
        contacts: number;
        deals: number;
    };
}

const roles = [
    { value: 'USER', label: 'User (Sales)', desc: 'Can only see own data' },
    { value: 'MANAGER', label: 'Manager', desc: 'Can only see own data' },
    { value: 'ADMIN', label: 'Admin', desc: 'Can see all data' },
];

export default function UsersPage() {
    const { user, token } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [form, setForm] = useState({
        email: '',
        password: '',
        name: '',
        role: 'USER',
    });

    useEffect(() => {
        if (token && user?.role === 'ADMIN') {
            loadUsers();
        }
    }, [token, user]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers(token!);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (existingUser?: UserData) => {
        if (existingUser) {
            setEditingUser(existingUser);
            setForm({
                email: existingUser.email,
                password: '',
                name: existingUser.name,
                role: existingUser.role,
            });
        } else {
            setEditingUser(null);
            setForm({ email: '', password: '', name: '', role: 'USER' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingUser) {
                // Update existing user
                const updateData: any = { email: form.email, name: form.name, role: form.role };
                if (form.password) {
                    updateData.password = form.password;
                }
                await api.updateUser(token!, editingUser.id, updateData);
            } else {
                // Create new user
                if (!form.password) {
                    alert('Password is required for new users');
                    setIsSubmitting(false);
                    return;
                }
                await api.createUser(token!, form);
            }
            setShowModal(false);
            loadUsers();
        } catch (error: any) {
            alert(error.message || 'Failed to save user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (userId: string) => {
        try {
            await api.deleteUser(token!, userId);
            setDeleteConfirm(null);
            loadUsers();
        } catch (error: any) {
            alert(error.message || 'Failed to delete user');
        }
    };

    // Only allow ADMIN access
    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Shield size={64} className="text-gray-300 mb-4" />
                <h1 className="text-xl font-semibold text-gray-900">Access Denied</h1>
                <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
                <Link href="/settings" className="mt-6 text-blue-600 hover:underline">
                    ← Back to Settings
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft size={16} /> Back to Settings
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-3">
                            <Users size={28} className="text-gray-600" />
                            User Management
                        </h1>
                        <p className="text-gray-500 mt-1">Manage team members and their permissions</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        Add User
                    </motion.button>
                </div>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((u, index) => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 truncate">{u.name}</h3>
                                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-900">{u._count?.leads || 0}</div>
                                        <div className="text-xs">Leads</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-900">{u._count?.contacts || 0}</div>
                                        <div className="text-xs">Contacts</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-900">{u._count?.deals || 0}</div>
                                        <div className="text-xs">Deals</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'ADMIN'
                                            ? 'bg-purple-100 text-purple-700'
                                            : u.role === 'MANAGER'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {u.role}
                                    </span>
                                    <button
                                        onClick={() => handleOpenModal(u)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    {u.id !== user?.id && (
                                        <button
                                            onClick={() => setDeleteConfirm(u.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Delete Confirmation */}
                            <AnimatePresence>
                                {deleteConfirm === u.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-gray-100"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-red-600">Delete this user? This action cannot be undone.</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}

                    {users.length === 0 && (
                        <div className="text-center py-16">
                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">No users found. Add your first team member.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit User Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Password {editingUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="••••••••"
                                            required={!editingUser}
                                            minLength={6}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                                    <div className="space-y-2">
                                        {roles.map(role => (
                                            <label
                                                key={role.value}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.role === role.value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role.value}
                                                    checked={form.role === role.value}
                                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{role.label}</div>
                                                    <div className="text-xs text-gray-500">{role.desc}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {editingUser ? 'Save Changes' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
