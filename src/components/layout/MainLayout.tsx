'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close mobile menu on route change could be good, but Sidebar handles links.
    // We can pass a close handler to Sidebar.

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Mobile Sidebar Backdrop */}
            <AnimatePresence>
                {isMobile && mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <Sidebar
                isCollapsed={isMobile ? false : sidebarCollapsed}
                isMobile={isMobile}
                isOpen={mobileMenuOpen}
                onToggle={isMobile ? () => setMobileMenuOpen(!mobileMenuOpen) : () => setSidebarCollapsed(!sidebarCollapsed)}
                onCloseMobile={() => setMobileMenuOpen(false)}
            />

            {/* Top Bar */}
            <TopBar
                sidebarCollapsed={isMobile ? true : sidebarCollapsed}
                onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                isMobile={isMobile}
            />

            {/* Main Content Area */}
            <motion.main
                initial={false}
                animate={{
                    marginLeft: isMobile ? 0 : (sidebarCollapsed ? 72 : 260),
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className="pt-16 min-h-screen transition-all"
            >
                <div className="p-4 sm:p-6 lg:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{
                                duration: 0.25,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.main>
        </div>
    );
}
