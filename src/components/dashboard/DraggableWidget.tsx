'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableWidgetProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    dragHandle?: boolean;
}

export function DraggableWidget({ id, children, className = '', dragHandle = true }: DraggableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group ${className} ${isDragging ? 'cursor-grabbing shadow-2xl ring-2 ring-blue-500 ring-opacity-50' : ''}`}
            {...(!dragHandle ? { ...attributes, ...listeners } : {})}
        >
            {dragHandle && (
                <div
                    className="absolute top-4 right-4 z-20 p-1.5 rounded-md bg-white/80 hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing backdrop-blur-sm"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={16} />
                </div>
            )}
            {children}
        </div>
    );
}
