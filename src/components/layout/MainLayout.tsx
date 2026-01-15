'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Top Bar */}
            <TopBar sidebarCollapsed={sidebarCollapsed} />

            {/* Main Content Area */}
            <motion.main
                initial={false}
                animate={{
                    marginLeft: sidebarCollapsed ? 72 : 260,
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className="pt-16 min-h-screen"
            >
                <div className="p-6">
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
