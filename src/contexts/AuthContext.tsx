'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inactivity timeout in milliseconds (15 minutes)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('crm_token');
        const savedUser = localStorage.getItem('crm_user');

        if (savedToken && savedUser) {
            // Check if token has expired due to inactivity
            const lastActivity = localStorage.getItem('crm_last_activity');
            if (lastActivity) {
                const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
                if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
                    // Token expired due to inactivity, clear everything
                    localStorage.removeItem('crm_token');
                    localStorage.removeItem('crm_user');
                    localStorage.removeItem('crm_last_activity');
                    setIsLoading(false);
                    return;
                }
            }
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_last_activity');
    }, []);

    // Auto logout on inactivity
    useEffect(() => {
        if (!token) return;

        let inactivityTimer: NodeJS.Timeout;

        const resetTimer = () => {
            // Update last activity timestamp
            localStorage.setItem('crm_last_activity', Date.now().toString());

            // Clear existing timer
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }

            // Set new timer
            inactivityTimer = setTimeout(() => {
                console.warn('Auto logout due to inactivity');
                logout();
                window.location.href = '/login?reason=inactivity';
            }, INACTIVITY_TIMEOUT);
        };

        // Events that reset the inactivity timer
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [token, logout]);

    const login = async (email: string, password: string) => {
        const response = await api.login(email, password);
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('crm_token', response.token);
        localStorage.setItem('crm_user', JSON.stringify(response.user));
        localStorage.setItem('crm_last_activity', Date.now().toString());
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const userData = await api.getMe(token);
            setUser(userData);
            localStorage.setItem('crm_user', JSON.stringify(userData));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const updateProfile = async (data: Partial<User>) => {
        if (!token) return;
        try {
            const updatedUser = await api.updateProfile(token, data);
            setUser(updatedUser);
            localStorage.setItem('crm_user', JSON.stringify(updatedUser));
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                logout,
                isAuthenticated: !!token,
                refreshUser,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

