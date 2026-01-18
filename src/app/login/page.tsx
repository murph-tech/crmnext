'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [appName, setAppName] = useState('CRM Next');
    const [appLogo, setAppLogo] = useState('');

    // Load branding settings and check setup status
    useEffect(() => {
        const checkSetupAndLoadBranding = async () => {
            try {
                // Check if setup is needed
                const setupResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/setup/check`);
                if (setupResponse.ok) {
                    const setupData = await setupResponse.json();
                    if (setupData.needsSetup) {
                        window.location.replace('/setup');
                        return;
                    }
                }

                // Fetch branding settings
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/settings/public`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.appName) setAppName(data.appName);
                    if (data.logo) setAppLogo(data.logo);
                }
            } catch (err) {
                // Use defaults if can't fetch settings
            }
        };
        checkSetupAndLoadBranding();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    {appLogo ? (
                        <img src={appLogo} alt={appName} className="w-16 h-16 mx-auto rounded-2xl object-contain mb-4" />
                    ) : (
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center mb-4">
                            <span className="text-white font-bold text-2xl">{appName.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-semibold text-gray-900">Welcome to {appName}</h1>
                    <p className="text-gray-500 mt-2">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <div className="glass-card rounded-3xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 rounded-xl spotlight-input text-sm"
                                    placeholder="Enter your email"
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4 rounded-xl spotlight-input text-sm"
                                    placeholder="Enter your password"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#007AFF] text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 hover:bg-[#0056CC] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
