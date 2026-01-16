'use client';

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableWidget } from './DraggableWidget';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface DashboardLayoutProps {
    widgets: {
        [key: string]: React.ReactNode;
    };
    defaultLayout: string[];
}

// Widget configuration for grid spans
const WIDGET_SPANS: { [key: string]: string } = {
    stats: 'lg:col-span-4',
    wonDeals: 'lg:col-span-4',
    reminders: 'lg:col-span-3',
    quickActions: 'lg:col-span-1',
    recentActivity: 'lg:col-span-4',
    dealsCount: 'lg:col-span-4',
};

export default function DashboardLayout({ widgets, defaultLayout }: DashboardLayoutProps) {
    const { user, token, updateProfile } = useAuth();
    const [items, setItems] = useState<string[]>(defaultLayout);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user?.preferences) {
            try {
                const prefs = JSON.parse(user.preferences);
                if (prefs.dashboardLayout && Array.isArray(prefs.dashboardLayout)) {
                    // Ensure all default widgets are present (in case of new widgets added later)
                    const savedLayout = prefs.dashboardLayout;
                    const missingItems = defaultLayout.filter(id => !savedLayout.includes(id));
                    setItems([...savedLayout, ...missingItems]);
                }
            } catch (e) {
                console.error('Failed to parse user preferences', e);
            }
        }
    }, [user?.preferences, defaultLayout]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Persist change
                saveLayout(newOrder);

                return newOrder;
            });
        }
    };

    const saveLayout = async (layout: string[]) => {
        if (!token) return;
        setIsSaving(true);
        try {
            let newPrefs = { dashboardLayout: layout };
            if (user?.preferences) {
                try {
                    const oldPrefs = JSON.parse(user.preferences);
                    newPrefs = { ...oldPrefs, dashboardLayout: layout };
                } catch (e) {
                    // ignore
                }
            }
            const preferences = JSON.stringify(newPrefs);
            // Use updateProfile from context to ensure local state and localStorage are updated
            await updateProfile({ preferences });
            // Update local context if needed (handled by useAuth usually if valid response)
        } catch (error) {
            console.error('Failed to save layout', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {items.map((id) => (
                        <DraggableWidget
                            key={id}
                            id={id}
                            className={WIDGET_SPANS[id] || 'lg:col-span-4'}
                        >
                            {widgets[id]}
                        </DraggableWidget>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
