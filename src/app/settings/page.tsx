'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User, Bell, Shield, Palette, X, Loader2, Save, Key, Mail, Lock, Link, Server, CheckCircle2, AlertCircle, Users, Building2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const settingsSections = [
    { id: 'profile', icon: User, label: 'Profile', desc: 'Manage your account details' },
    { id: 'company', icon: Building2, label: 'Company Info', desc: 'ข้อมูลบริษัทสำหรับเอกสาร' },
    { id: 'users', icon: Users, label: 'User Management', desc: 'Manage team members', adminOnly: true },
    { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Configure alert preferences' },
    { id: 'security', icon: Shield, label: 'Security', desc: 'Password and authentication' },
    { id: 'integrations', icon: Link, label: 'Integrations', desc: 'Connect email and third-party services' },
    { id: 'appearance', icon: Palette, label: 'Appearance', desc: 'Customize the interface' },
];

export default function SettingsPage() {
    const { user, token, refreshUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Check for query param to open specific section
    useEffect(() => {
        const section = searchParams.get('section');
        if (section && settingsSections.some(s => s.id === section)) {
            setActiveModal(section);
        }
    }, [searchParams]);

    // Profile Form State
    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

    // SMTP Form State
    const [smtpForm, setSmtpForm] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        secure: false,
        from: ''
    });
    const [isSmtpSubmitting, setIsSmtpSubmitting] = useState(false);
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [integrationTab, setIntegrationTab] = useState<'smtp' | 'google'>('smtp');

    // Test Email Recipient
    const [testEmailRecipient, setTestEmailRecipient] = useState('');

    // Branding Form State
    const [brandingForm, setBrandingForm] = useState({ appName: 'CRM Pro', logo: '' });
    const [isBrandingSubmitting, setIsBrandingSubmitting] = useState(false);

    // Company Info Form State
    const [companyForm, setCompanyForm] = useState({
        company_name_th: '',
        company_name_en: '',
        company_address_th: '',
        company_address_en: '',
        company_tax_id: '',
        company_phone: '',
        company_email: '',
        company_logo: '',  // Base64 image - Logo
        company_stamp: '', // Base64 image - Stamp
        bank_name: '',
        bank_account: '',
        bank_branch: '',
    });
    const [isCompanySubmitting, setIsCompanySubmitting] = useState(false);

    // Initial load user data & settings
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
            });
            setTestEmailRecipient(user.email || '');
        }
        if (token) {
            loadSettings();
        }
    }, [user, token]);

    const loadSettings = async () => {
        try {
            const settings = await api.getSettings(token!) as Record<string, any>;
            if (settings.smtp_config) {
                setSmtpForm(settings.smtp_config);
            }
            if (settings.branding) {
                setBrandingForm({
                    appName: settings.branding.appName || 'CRM Pro',
                    logo: settings.branding.logo || ''
                });
            }
            if (settings.company_info) {
                setCompanyForm(prev => ({ ...prev, ...settings.company_info }));
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleSectionClick = (id: string) => {
        // Navigate to dedicated page for users
        if (id === 'users') {
            router.push('/settings/users');
            return;
        }
        setActiveModal(id);
        // Reset specific forms if needed
        if (id === 'security') {
            setPasswordForm({ current: '', new: '', confirm: '' });
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBrandingForm(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsBrandingSubmitting(true);
        try {
            await api.saveSetting(token!, 'branding', brandingForm);
            alert('Branding settings saved. The page will reload to apply changes.');
            window.location.reload();
        } catch (error: any) {
            alert(error.message || 'Failed to save branding settings');
        } finally {
            setIsBrandingSubmitting(false);
        }
    };

    const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyForm(prev => ({ ...prev, company_logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyForm(prev => ({ ...prev, company_stamp: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCompanySubmitting(true);
        try {
            await api.saveSetting(token!, 'company_info', companyForm);
            alert('บันทึกข้อมูลบริษัทสำเร็จ');
            setActiveModal(null);
        } catch (error: any) {
            alert(error.message || 'Failed to save company info');
        } finally {
            setIsCompanySubmitting(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProfileSubmitting(true);
        try {
            await api.updateProfile(token!, profileForm);
            await refreshUser();
            setActiveModal(null);
            alert('Profile updated successfully');
        } catch (error: any) {
            alert(error.message || 'Failed to update profile');
        } finally {
            setIsProfileSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            alert('New passwords do not match');
            return;
        }
        setIsPasswordSubmitting(true);
        try {
            await api.changePassword(token!, {
                currentPassword: passwordForm.current,
                newPassword: passwordForm.new
            });
            setActiveModal(null);
            alert('Password changed successfully');
        } catch (error: any) {
            alert(error.message || 'Failed to change password');
        } finally {
            setIsPasswordSubmitting(false);
        }
    };

    const handleSaveSmtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSmtpSubmitting(true);
        try {
            await api.saveSetting(token!, 'smtp_config', {
                ...smtpForm,
                auth: { user: smtpForm.user, pass: smtpForm.pass }
            });
            alert('Email settings saved successfully');
        } catch (error: any) {
            alert(error.message || 'Failed to save email settings');
        } finally {
            setIsSmtpSubmitting(false);
        }
    };

    const handleTestEmail = async () => {
        setIsTestingEmail(true);
        try {
            const config = {
                ...smtpForm,
                auth: { user: smtpForm.user, pass: smtpForm.pass },
                toEmail: testEmailRecipient
            };
            const res = await api.testEmail(token!, config);
            alert(res.message);
        } catch (error: any) {
            alert(error.message || 'Email test failed');
        } finally {
            setIsTestingEmail(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-3">
                    <Settings size={28} className="text-gray-600" />
                    Settings
                </h1>
                <p className="text-gray-500 mt-1">Manage your preferences and account</p>
            </motion.div>

            <div className="space-y-4">
                {settingsSections
                    .filter(section => !section.adminOnly || user?.role === 'ADMIN')
                    .map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ x: 4 }}
                                onClick={() => handleSectionClick(section.id)}
                                className="glass-card rounded-2xl p-5 cursor-pointer group hover:bg-white hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                                        <Icon size={22} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{section.label}</h3>
                                        <p className="text-sm text-gray-500">{section.desc}</p>
                                    </div>
                                    <span className="text-gray-300 group-hover:text-blue-500 transition-colors">→</span>
                                </div>
                            </motion.div>
                        );
                    })}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {settingsSections.find(s => s.id === activeModal)?.label}
                                </h2>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {activeModal === 'profile' && (
                                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={profileForm.name}
                                                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal(null)}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isProfileSubmitting}
                                                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                {isProfileSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeModal === 'company' && (
                                    <form onSubmit={handleSaveCompany} className="space-y-4">
                                        {/* Company Logo */}
                                        <div className="flex justify-center mb-4">
                                            <div className="text-center">
                                                <div className="w-24 h-24 mx-auto rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-colors">
                                                    {companyForm.company_logo ? (
                                                        <img src={companyForm.company_logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <div className="text-gray-400 flex flex-col items-center">
                                                            <Building2 size={24} className="mb-1" />
                                                            <span className="text-[10px]">อัปโหลดโลโก้</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium pointer-events-none">
                                                        เปลี่ยน
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleCompanyLogoChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">โลโก้บริษัท (200x200px)</p>
                                                {companyForm.company_logo && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCompanyForm({ ...companyForm, company_logo: '' })}
                                                        className="text-red-500 text-xs mt-1 hover:underline"
                                                    >
                                                        ลบโลโก้
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Company Names */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อบริษัท (ภาษาไทย)</label>
                                                <input
                                                    type="text"
                                                    value={companyForm.company_name_th}
                                                    onChange={e => setCompanyForm({ ...companyForm, company_name_th: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="บริษัท ตัวอย่าง จำกัด"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name (English)</label>
                                                <input
                                                    type="text"
                                                    value={companyForm.company_name_en}
                                                    onChange={e => setCompanyForm({ ...companyForm, company_name_en: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="Example Co., Ltd."
                                                />
                                            </div>
                                        </div>

                                        {/* Addresses */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">ที่อยู่ (ภาษาไทย)</label>
                                            <textarea
                                                value={companyForm.company_address_th}
                                                onChange={e => setCompanyForm({ ...companyForm, company_address_th: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                rows={2}
                                                placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                                            />
                                        </div>

                                        {/* Tax ID & Contact */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">เลขผู้เสียภาษี</label>
                                                <input
                                                    type="text"
                                                    value={companyForm.company_tax_id}
                                                    onChange={e => setCompanyForm({ ...companyForm, company_tax_id: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="0-1234-56789-01-2"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                                                <input
                                                    type="text"
                                                    value={companyForm.company_phone}
                                                    onChange={e => setCompanyForm({ ...companyForm, company_phone: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="02-123-4567"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">อีเมลบริษัท</label>
                                            <input
                                                type="email"
                                                value={companyForm.company_email}
                                                onChange={e => setCompanyForm({ ...companyForm, company_email: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="info@company.com"
                                            />
                                        </div>

                                        {/* Bank Info */}
                                        <div className="border-t border-gray-100 pt-4 mt-4">
                                            <h4 className="text-sm font-medium text-gray-800 mb-3">ข้อมูลธนาคาร (สำหรับใบเสนอราคา)</h4>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">ชื่อธนาคาร</label>
                                                    <input
                                                        type="text"
                                                        value={companyForm.bank_name}
                                                        onChange={e => setCompanyForm({ ...companyForm, bank_name: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm"
                                                        placeholder="ธนาคารไทยพาณิชย์"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">เลขบัญชี</label>
                                                    <input
                                                        type="text"
                                                        value={companyForm.bank_account}
                                                        onChange={e => setCompanyForm({ ...companyForm, bank_account: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm"
                                                        placeholder="123-456-7890"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">สาขา</label>
                                                    <input
                                                        type="text"
                                                        value={companyForm.bank_branch}
                                                        onChange={e => setCompanyForm({ ...companyForm, bank_branch: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm"
                                                        placeholder="สาขาสีลม"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Company Stamp */}
                                        <div className="border-t border-gray-100 pt-4 mt-4">
                                            <h4 className="text-sm font-medium text-gray-800 mb-3">ตราประทับบริษัท</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-colors">
                                                    {companyForm.company_stamp ? (
                                                        <img src={companyForm.company_stamp} alt="Stamp" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <div className="text-gray-400 flex flex-col items-center">
                                                            <Upload size={24} className="mb-1" />
                                                            <span className="text-[10px]">อัปโหลด</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium pointer-events-none">
                                                        เปลี่ยน
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleStampChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    />
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    <p>อัปโหลดรูปตราประทับบริษัท</p>
                                                    <p className="text-xs mt-1">แนะนำ: PNG พื้นหลังใส ขนาด 200x200px</p>
                                                    {companyForm.company_stamp && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCompanyForm({ ...companyForm, company_stamp: '' })}
                                                            className="text-red-500 text-xs mt-2 hover:underline"
                                                        >
                                                            ลบตราประทับ
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal(null)}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isCompanySubmitting}
                                                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                {isCompanySubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                บันทึก
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeModal === 'security' && (
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.current}
                                                    onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.new}
                                                    onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.confirm}
                                                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal(null)}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isPasswordSubmitting}
                                                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                {isPasswordSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Update Password
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {activeModal === 'integrations' && (
                                    <div>
                                        <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-xl">
                                            <button
                                                onClick={() => setIntegrationTab('smtp')}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${integrationTab === 'smtp' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                SMTP Server
                                            </button>
                                            <button
                                                onClick={() => setIntegrationTab('google')}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${integrationTab === 'google' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Google Workspace
                                            </button>
                                        </div>

                                        {integrationTab === 'smtp' && (
                                            <form onSubmit={handleSaveSmtp} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
                                                        <div className="relative">
                                                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                            <input
                                                                type="text"
                                                                value={smtpForm.host}
                                                                onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                                placeholder="smtp.gmail.com"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                                                        <input
                                                            type="text"
                                                            value={smtpForm.port}
                                                            onChange={e => setSmtpForm({ ...smtpForm, port: e.target.value })}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                            placeholder="587"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                                                        <input
                                                            type="text"
                                                            value={smtpForm.user}
                                                            onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                            placeholder="email@example.com"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                                        <input
                                                            type="password"
                                                            value={smtpForm.pass}
                                                            onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                            placeholder="App Password"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name/Email</label>
                                                    <input
                                                        type="text"
                                                        value={smtpForm.from}
                                                        onChange={e => setSmtpForm({ ...smtpForm, from: e.target.value })}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                        placeholder="My CRM <notifications@example.com>"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="secure"
                                                        checked={smtpForm.secure}
                                                        onChange={e => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="secure" className="text-sm text-gray-700">Use Secure Connection (SSL/TLS)</label>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 mt-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Send Test Email To</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                        <input
                                                            type="email"
                                                            value={testEmailRecipient}
                                                            onChange={e => setTestEmailRecipient(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                            placeholder="recipient@example.com"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">Specify where to send the test email. Real reminders will be sent to the activity owner.</p>
                                                </div>

                                                <div className="flex gap-3 pt-4 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleTestEmail}
                                                        disabled={isTestingEmail || !smtpForm.host}
                                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        {isTestingEmail ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                        Test Connection
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isSmtpSubmitting}
                                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                                    >
                                                        {isSmtpSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                        Save Settings
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {integrationTab === 'google' && (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Mail size={32} className="text-blue-500" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900">Google Workspace</h3>
                                                <p className="text-gray-500 mt-2 mb-6">Connect your Google Workspace account for enhanced features.</p>
                                                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm text-left mb-6 flex gap-3">
                                                    <AlertCircle size={20} className="flex-shrink-0" />
                                                    <p>Use the SMTP tab with your Gmail credentials (and App Password) for sending emails immediately. OAuth integration is coming soon.</p>
                                                </div>
                                                <button
                                                    onClick={() => setIntegrationTab('smtp')}
                                                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                                >
                                                    Switch to SMTP for Gmail
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeModal === 'appearance' && (
                                    <form onSubmit={handleSaveBranding} className="space-y-6">
                                        <div className="flex justify-center mb-6">
                                            <div className="text-center">
                                                <div className="w-24 h-24 mx-auto rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-colors">
                                                    {brandingForm.logo ? (
                                                        <img src={brandingForm.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <div className="text-gray-400 flex flex-col items-center">
                                                            <Palette size={24} className="mb-1" />
                                                            <span className="text-[10px]">Upload Logo</span>
                                                        </div>
                                                    )}
                                                    {/* Hover overlay - pointer-events-none so clicks pass through */}
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium pointer-events-none">
                                                        Change
                                                    </div>
                                                    {/* File input on top with highest z-index */}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Recommended: 200x200px PNG</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Name</label>
                                            <div className="relative">
                                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={brandingForm.appName}
                                                    onChange={e => setBrandingForm({ ...brandingForm, appName: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    placeholder="CRM Next"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal(null)}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isBrandingSubmitting}
                                                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                {isBrandingSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Save Settings
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {(activeModal === 'notifications') && (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Settings size={32} className="text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
                                        <p className="text-gray-500 mt-2">This feature is currently under development.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
