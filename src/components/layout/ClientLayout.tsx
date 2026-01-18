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

    const isPublicPage = pathname === '/login' || pathname === '/setup';

    // Redirect to login if not authenticated (except for public pages)
    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isPublicPage) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, isPublicPage, router]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Public pages - no main layout
    if (isPublicPage) {
        return <>{children}</>;
    }

    // Not authenticated - will redirect
    if (!isAuthenticated) {
        return null;
    }

    // Authenticated - show main layout
    return <MainLayout>{children}</MainLayout>;
}

