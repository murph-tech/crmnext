
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    type?: 'info' | 'danger' | 'warning' | 'success';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    type = 'warning',
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    isLoading = false
}: ConfirmDialogProps) {

    const colors = {
        info: 'bg-blue-600 hover:bg-blue-700',
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-amber-500 hover:bg-amber-600',
        success: 'bg-green-600 hover:bg-green-700',
    };

    const icons = {
        info: <CheckCircle className="text-blue-500 w-12 h-12 mb-4" />,
        danger: <XCircle className="text-red-500 w-12 h-12 mb-4" />,
        warning: <AlertTriangle className="text-amber-500 w-12 h-12 mb-4" />,
        success: <CheckCircle className="text-green-500 w-12 h-12 mb-4" />,
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="flex flex-col items-center text-center p-4">
                {icons[type]}
                <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">
                    {description}
                </p>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-white font-medium shadow-lg shadow-black/5 transition active:scale-[0.98] disabled:opacity-50 ${colors[type]}`}
                    >
                        {isLoading ? 'กำลังประมวลผล...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
