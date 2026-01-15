'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from './MainLayout';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isLoginPage = pathname === '/login';

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isLoginPage) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, isLoginPage, router]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Login page - no main layout
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Not authenticated - will redirect
    if (!isAuthenticated) {
        return null;
    }

    // Authenticated - show main layout
    return <MainLayout>{children}</MainLayout>;
}
