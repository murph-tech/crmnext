'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface TopBarProps {
    sidebarCollapsed: boolean;
}

export default function TopBar({ sidebarCollapsed }: TopBarProps) {
    const { user, logout, token } = useAuth();
    const [searchFocused, setSearchFocused] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationMenuRef = useRef<HTMLDivElement>(null);

    // Fetch notifications (reminders)
    useEffect(() => {
        if (token) {
            api.getReminders(token).then(data => {
                // Deduplicate just in case
                const uniqueData = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
                setNotifications(uniqueData);

                // Check unread status using localStorage
                try {
                    const seenIds = JSON.parse(localStorage.getItem('crm_seen_notifications') || '[]');
                    const hasNew = uniqueData.some((n: any) => !seenIds.includes(n.id));
                    setHasUnread(hasNew);
                } catch (e) {
                    setHasUnread(true);
                }
            }).catch(console.error);
        }
    }, [token]);

    // Get user initials
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    // Keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
            if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        const newShowState = !showNotifications;
        setShowNotifications(newShowState);

        if (newShowState && hasUnread) {
            setHasUnread(false);
            // Mark all current as seen
            const ids = notifications.map((n: any) => n.id);
            localStorage.setItem('crm_seen_notifications', JSON.stringify(ids));
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <motion.header
            initial={false}
            animate={{
                marginLeft: sidebarCollapsed ? 72 : 260,
            }}
            transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed top-0 right-0 h-16 z-50 glass-topbar flex items-center justify-between px-6"
            style={{ left: 0 }}
        >
            {/* Spotlight Search */}
            <div className="flex-1 max-w-xl">
                <motion.div
                    animate={{
                        scale: searchFocused ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className="relative"
                >
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                    </div>

                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search anything..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full h-10 pl-10 pr-20 rounded-xl spotlight-input text-sm text-gray-700 placeholder:text-gray-400"
                    />

                    {/* Keyboard shortcut hint */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                            <Command size={10} />
                            <span>K</span>
                        </kbd>
                    </div>
                </motion.div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 ml-6">
                {/* Notifications */}
                <div ref={notificationMenuRef} className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBellClick}
                        className="relative p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors duration-200"
                    >
                        <Bell size={18} className="text-gray-600" />
                        {/* Notification badge */}
                        {hasUnread && notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </motion.button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-80 py-2 glass rounded-2xl shadow-lg overflow-hidden z-50"
                            >
                                <div className="px-4 py-3 border-b border-black/[0.06] flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                                    <span className="text-xs text-gray-500">{notifications.length} New</span>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-gray-500 text-sm">
                                            No new notifications
                                        </div>
                                    ) : (
                                        notifications.map((notif: any) => (
                                            <div key={notif.id} className="px-4 py-3 hover:bg-black/[0.02] border-b border-black/[0.04] last:border-0">
                                                <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Due: {new Date(notif.dueDate).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Profile */}
                <div ref={profileMenuRef} className="relative">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-black/[0.04] transition-colors duration-200"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#AF52DE] flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{initials}</span>
                        </div>
                        <div className="hidden sm:flex flex-col items-start">
                            <span className="text-sm font-medium text-gray-800">{user?.name || 'User'}</span>
                            <span className="text-[11px] text-gray-500">{user?.role || 'User'}</span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''
                                }`}
                        />
                    </motion.button>

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                        {showProfileMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-56 py-2 glass rounded-2xl shadow-lg overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-black/[0.06]">
                                    <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <div className="py-1">
                                    {['Profile Settings', 'Preferences', 'Help & Support'].map((item) => (
                                        <button
                                            key={item}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-black/[0.04] transition-colors duration-150"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-black/[0.06] pt-1 mt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
}
