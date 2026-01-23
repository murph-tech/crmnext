'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Filter, Search, X, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { ColumnDef } from '@/types/table';

interface ColumnHeaderProps {
    column: ColumnDef;
    onResize: (id: string, width: number) => void;
    onFilterChange: (id: string, value: string) => void;
    index: number;
    onSort?: (id: string) => void;
}

export function ColumnHeader({
    column,
    onResize,
    onFilterChange,
    onSort,
    index
}: ColumnHeaderProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        width: typeof column.width === 'number' ? `${column.width}px` : column.width,
        minWidth: `${column.minWidth}px`,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.pageX;
        const startWidth = typeof column.width === 'number' ? column.width : 200;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(column.minWidth, startWidth + (moveEvent.pageX - startX));
            onResize(column.id, newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group/header relative flex items-center h-full px-4 py-3 bg-gray-50 border-r border-gray-200 last:border-r-0 select-none overflow-visible"
        >
            <div
                {...attributes}
                {...listeners}
                className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing min-w-0"
            >
                <GripVertical size={10} className="text-gray-300 group-hover/header:text-gray-400 shrink-0" />
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                    {column.label}
                </div>
                {column.filterValue && (
                    <div className="px-1.5 py-0.5 rounded-full bg-[#007AFF] text-[8px] font-black text-white shrink-0">
                        FILTERED
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-1 rounded-md transition-colors ${column.filterValue ? 'text-[#007AFF] bg-blue-50' : 'text-gray-400 hover:bg-gray-200'}`}
                >
                    <Filter size={10} strokeWidth={3} />
                </button>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007AFF] transition-colors z-20"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Filter Dropdown */}
            {isFilterOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute top-full ${index > 3 ? 'right-0' : 'left-0'} mt-2 w-72 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-5 z-50`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Filter {column.label}</span>
                            <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${column.label.toLowerCase()}...`}
                                value={column.filterValue}
                                onChange={(e) => onFilterChange(column.id, e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition-all font-medium"
                            />
                            {column.filterValue && (
                                <button
                                    onClick={() => onFilterChange(column.id, '')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
}
