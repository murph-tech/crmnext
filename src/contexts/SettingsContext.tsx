'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
    settings: Record<string, any>;
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth();
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const lastFetchTime = useRef<number>(0);
    const fetchPromise = useRef<Promise<void> | null>(null);

    const loadSettings = useCallback(async (force = false) => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime.current;

        // Return cached data if TTL not expired and not forced refresh
        // Use lastFetchTime to determine if we have valid data instead of settings state
        if (!force && timeSinceLastFetch < CACHE_TTL && lastFetchTime.current > 0) {
            return;
        }

        // Deduplicate concurrent requests
        if (fetchPromise.current) {
            await fetchPromise.current;
            return;
        }

        const fetchData = async () => {
            try {
                setIsLoading(true);
                const data = await api.getSettings(token);
                setSettings(data);
                lastFetchTime.current = Date.now();
            } catch (error) {
                // In development mode, mock data is returned automatically
                // In production, this error would indicate backend issues
                if (process.env.NODE_ENV !== 'development') {
                    console.error('Failed to load settings:', error);
                }
            } finally {
                setIsLoading(false);
                fetchPromise.current = null;
            }
        };

        fetchPromise.current = fetchData();
        await fetchPromise.current;
    }, [token]);

    const refreshSettings = useCallback(async () => {
        await loadSettings(true);
    }, [loadSettings]);

    // Load settings when token becomes available
    useEffect(() => {
        if (token) {
            loadSettings();
        } else {
            setSettings({});
            setIsLoading(false);
        }
    }, [token, loadSettings]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                refreshSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
