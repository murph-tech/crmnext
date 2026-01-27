'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, RefreshCw, Mail, Users, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IntegrationsPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; lastSynced?: string }>({ connected: false });
    const [isSyncing, setIsSyncing] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configData, setConfigData] = useState({ clientId: '', clientSecret: '' });

    useEffect(() => {
        if (token) {
            checkStatus();
        }
    }, [token]);

    const checkStatus = async () => {
        try {
            const status = await api.getGoogleIntegrationStatus(token!);
            setGoogleStatus(status);
        } catch (error) {
            console.error('Failed to get status', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            const { url } = await api.getGoogleAuthUrl(token!);
            window.location.href = url;
        } catch (error: any) {
            // Relaxed check to ensure modal opens
            if (
                error.code === 'MISSING_CONFIG' ||
                JSON.stringify(error).includes('MISSING_CONFIG') ||
                error.message?.includes('Configuration Missing')
            ) {
                setShowConfigModal(true);
            } else {
                console.error('Full Connect Error:', error);
                alert('Failed to initialize connection: ' + (error.message || 'Unknown error'));
            }
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.saveGoogleConfig(token!, configData.clientId, configData.clientSecret);
            setShowConfigModal(false);
            // Try connecting again immediately
            handleConnectGoogle();
        } catch (error: any) {
            alert('Failed to save configuration: ' + error.message);
        }
    };

    const handleSyncContacts = async () => {
        setIsSyncing(true);
        try {
            const result = await api.syncGoogleContacts(token!);
            if (result.success) {
                alert(`Successfully imported ${result.imported} contacts from ${result.totalFound} found.`);
            }
        } catch (error) {
            alert('Sync failed. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Integrations Hub</h1>
                <p className="text-gray-500 mt-1">Connect your favorite tools to supercharge your CRM.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Google Workspace Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-6"
                >
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-3 shadow-sm shrink-0">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-full h-full object-contain" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">Google Workspace</h3>
                            {googleStatus.connected && (
                                <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Connected
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1 mb-3">
                            Sync your Google Contacts and Calendar events directly into the CRM.
                            Keep everything organized in one place.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                                <Users size={12} /> Auto-Sync Contacts
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                                <Calendar size={12} /> Sync Calendar
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {isLoading ? (
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        ) : googleStatus.connected ? (
                            <div className="flex flex-col gap-2 w-full">
                                <button
                                    onClick={handleSyncContacts}
                                    disabled={isSyncing}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm min-w-[140px]"
                                >
                                    {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    Sync Contacts
                                </button>
                                <button className="px-4 py-2 text-gray-400 font-medium text-xs hover:text-red-500 transition-colors">
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnectGoogle}
                                className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
                            >
                                Connect Account
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Microsoft Outlook (Placeholder) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-6 opacity-60 grayscale"
                >
                    <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center p-3 shrink-0">
                        <Mail className="w-8 h-8 text-blue-500" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">Microsoft Outlook</h3>
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Coming Soon</span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Sync Outlook contacts and calendar. Currently under development.
                        </p>
                    </div>

                    <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 font-medium rounded-xl cursor-not-allowed">
                        Connect
                    </button>
                </motion.div>
            </div>

            {/* Config Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Google Integration (Admin)</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Since no server-side configuration was found, please enter your Google Cloud credentials to enable this integration for the platform.
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-600 hover:underline ml-1">
                                Get them here &rarr;
                            </a>
                        </p>

                        <form onSubmit={handleSaveConfig} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                                <input
                                    type="text"
                                    required
                                    value={configData.clientId}
                                    onChange={e => setConfigData({ ...configData, clientId: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                                <input
                                    type="password"
                                    required
                                    value={configData.clientSecret}
                                    onChange={e => setConfigData({ ...configData, clientSecret: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
