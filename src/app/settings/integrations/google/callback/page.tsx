'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const { token } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

    useEffect(() => {
        if (!code || !token) {
            setStatus('error');
            return;
        }

        const handleCallback = async () => {
            try {
                // 1. Exchange Code for Token
                await api.handleGoogleCallback(token, code);

                // 2. Auto-Sync Contacts Immediately
                await api.syncGoogleContacts(token);

                setStatus('success');
                setTimeout(() => {
                    router.push('/settings/integrations?success=true');
                }, 1500);
            } catch (error) {
                console.error('Callback error:', error);
                setStatus('error');
            }
        };

        handleCallback();
    }, [code, token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                {status === 'processing' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                        <h2 className="text-xl font-bold text-gray-800">Connecting & Syncing...</h2>
                        <p className="text-gray-500">We are securely importing your Google Contacts.</p>
                    </div>
                )}

                {status === 'success' && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-4"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-gray-800">Sync Complete!</h2>
                        <p className="text-gray-500">Your contacts have been imported.</p>
                    </motion.div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-gray-800">Connection Failed</h2>
                        <p className="text-gray-500">Something went wrong. Please try again.</p>
                        <button
                            onClick={() => router.push('/settings/integrations')}
                            className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Back to Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
