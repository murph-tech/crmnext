
'use client';

import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
    toasts: [],
    addToast: ({ type, message, description, duration = 4000 }) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
            toasts: [...state.toasts, { id, type, message, description, duration }],
        }));

        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
    },
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-auto w-80 glass-card rounded-2xl shadow-lg border border-white/60 p-4 flex gap-3 relative overflow-hidden"
                    >
                        {/* Status Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${toast.type === 'success' ? 'bg-green-500' :
                                toast.type === 'error' ? 'bg-red-500' :
                                    toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />

                        <div className="mt-0.5">
                            {toast.type === 'success' && <CheckCircle size={20} className="text-green-600" />}
                            {toast.type === 'error' && <XCircle size={20} className="text-red-600" />}
                            {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
                            {toast.type === 'info' && <Info size={20} className="text-blue-600" />}
                        </div>

                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">{toast.message}</h4>
                            {toast.description && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{toast.description}</p>
                            )}
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors self-start"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
