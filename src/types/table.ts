import { UniqueIdentifier } from '@dnd-kit/core';

export interface ColumnDef {
    id: string;
    label: string;
    width: number | string;
    minWidth: number;
    visible: boolean;
    filterValue: string;
    sortDirection?: 'asc' | 'desc' | null;
}

export interface TablePersistenceConfig {
    key: string;
    version: string;
}
