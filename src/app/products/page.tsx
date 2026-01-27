'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Tag,
    Archive,
    Loader2,
    AlertCircle,
    GripVertical,
    X,
    Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { ColumnDef } from '@/types/table';
import { ColumnHeader } from '@/components/ui/ColumnHeader';
import {
    DndContext,
    closestCorners,
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Product } from '@/types';

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'name', label: 'Product Name', width: '2fr', minWidth: 200, visible: true, filterValue: '' },
    { id: 'type', label: 'Type', width: 120, minWidth: 100, visible: true, filterValue: '' },
    { id: 'sku', label: 'SKU', width: 120, minWidth: 100, visible: true, filterValue: '' },
    { id: 'price', label: 'Price', width: 120, minWidth: 100, visible: true, filterValue: '' },
    { id: 'status', label: 'Status', width: 100, minWidth: 80, visible: true, filterValue: '' },
];

export default function ProductsPage() {
    const { token } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sku: '',
        price: '',
        type: 'SERVICE',
        isActive: true,
    });

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('crm_products_columns_v1');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = DEFAULT_COLUMNS.map(col => {
                    const existing = parsed.find((p: any) => p.id === col.id);
                    return existing ? { ...col, ...existing, filterValue: '' } : col;
                });
                setColumns(merged);
            } catch (e) {
                console.error('Failed to parse columns', e);
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('crm_products_columns_v1', JSON.stringify(columns.map(({ id, width, visible }) => ({ id, width, visible }))));
        }
    }, [columns, isInitialized]);

    // --- Sensors ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getProducts(token!);
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) loadProducts();
    }, [token, loadProducts]);

    const handleColumnMove = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleResize = (id: string, width: number) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, width } : col));
    };

    const handleFilterChange = (id: string, value: string) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, filterValue: value } : col));
    };

    const gridTemplateColumns = useMemo(() => {
        const cols = columns.filter(c => c.visible).map(c =>
            typeof c.width === 'number' ? `${c.width}px` : c.width
        );
        return `40px ${cols.join(' ')} 80px`;
    }, [columns]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            return columns.every(col => {
                if (!col.filterValue) return true;
                const val = col.filterValue.toLowerCase();

                switch (col.id) {
                    case 'name':
                        return product.name.toLowerCase().includes(val) || product.description?.toLowerCase().includes(val);
                    case 'type':
                        return product.type.toLowerCase().includes(val);
                    case 'sku':
                        return product.sku?.toLowerCase().includes(val);
                    case 'price':
                        return product.price.toString().includes(val);
                    case 'status':
                        const statusText = product.isActive ? 'active' : 'inactive';
                        return statusText.includes(val);
                    default:
                        return true;
                }
            });
        });
    }, [products, columns]);

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            sku: '',
            price: '',
            type: 'SERVICE',
            isActive: true,
        });
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.createProduct(token!, {
                ...formData,
                price: parseFloat(formData.price),
                type: formData.type as 'INVENTORY' | 'SERVICE'
            });
            await loadProducts();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create product:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setIsSubmitting(true);
        try {
            await api.updateProduct(token!, selectedProduct.id, {
                ...formData,
                price: parseFloat(formData.price),
                type: formData.type as 'INVENTORY' | 'SERVICE'
            });
            await loadProducts();
            setShowEditModal(false);
            setSelectedProduct(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update product:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) return;
        setIsSubmitting(true);
        try {
            await api.deleteProduct(token!, selectedProduct.id);
            await loadProducts();
            setShowDeleteModal(false);
            setSelectedProduct(null);
        } catch (error) {
            console.error('Failed to delete product:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            sku: product.sku || '',
            price: product.price.toString(),
            type: product.type,
            isActive: product.isActive,
        });
        setShowEditModal(true);
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const { exportToCsv } = await import('@/lib/csvHelper');
            exportToCsv(products.map(p => ({
                Name: p.name,
                Type: p.type,
                SKU: p.sku || '-',
                Price: p.price,
                Status: p.isActive ? 'Active' : 'Inactive'
            })), `products-export-${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading && products.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-[#007AFF]" />
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-4 flex-shrink-0"
            >
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#FF9500] flex items-center gap-2">
                        <Package size={24} />
                        Products <span className="text-gray-400 font-normal text-sm ml-2">({filteredProducts.length})</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#FF9500] text-white text-sm font-medium rounded-lg hover:bg-[#E68600] transition-colors"
                    >
                        <Plus size={16} />
                        <span>New Product</span>
                    </button>
                </div>
            </motion.div>

            {/* Products List */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col relative overflow-hidden">
                <div className="overflow-x-auto flex-1 flex flex-col min-w-full">
                    <div className="min-w-[900px] flex flex-col flex-1">
                        {/* Desktop Table Header */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragEnd={handleColumnMove}
                        >
                            <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <div
                                    className="hidden md:grid gap-0 border-b border-gray-200 bg-gray-50 items-center sticky top-0 z-20"
                                    style={{ gridTemplateColumns }}
                                >
                                    <div className="flex justify-center px-4 py-3 h-full items-center border-r border-gray-200 bg-gray-50">
                                        <input type="checkbox" className="rounded border-gray-300 text-[#FF9500] focus:ring-[#FF9500]" />
                                    </div>
                                    {columns.filter(c => c.visible).map((col, idx) => (
                                        <ColumnHeader
                                            key={col.id}
                                            column={col}
                                            onResize={handleResize}
                                            onFilterChange={handleFilterChange}
                                            index={idx}
                                        />
                                    ))}
                                    <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center bg-gray-50">Action</div>
                                </div>
                            </SortableContext>
                        </DndContext>

                        {/* List Body */}
                        <div className="overflow-y-auto flex-1 bg-white">
                            {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                                <div key={product.id} className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors ${!product.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                                    {/* Desktop Row */}
                                    <div
                                        className="hidden md:grid gap-0 items-center text-sm"
                                        style={{ gridTemplateColumns }}
                                    >
                                        <div className="flex justify-center border-r border-gray-100/50 h-full items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-[#FF9500] focus:ring-[#FF9500]" />
                                        </div>

                                        {columns.filter(c => c.visible).map(col => {
                                            switch (col.id) {
                                                case 'name':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 flex items-center gap-3 min-w-0 border-r border-gray-100/50 h-full">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                {product.type === 'SERVICE' ? <Tag size={16} /> : <Archive size={16} />}
                                                            </div>
                                                            <div className="truncate">
                                                                <span className="font-medium text-gray-900 block truncate">{product.name}</span>
                                                                {product.description && <span className="text-xs text-gray-500 truncate block">{product.description}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                case 'type':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center justify-center">
                                                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                {product.type}
                                                            </span>
                                                        </div>
                                                    );
                                                case 'sku':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center font-mono text-xs text-gray-500">
                                                            {product.sku || '-'}
                                                        </div>
                                                    );
                                                case 'price':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center justify-end font-medium text-gray-900">
                                                            {formatCurrency(product.price)}
                                                        </div>
                                                    );
                                                case 'status':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center justify-center">
                                                            {product.isActive ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })}

                                        {/* Actions */}
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-4 h-full">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                                                className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowDeleteModal(true); }}
                                                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {product.type === 'SERVICE' ? <Tag size={18} /> : <Archive size={18} />}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                                                    <p className="text-xs text-gray-500">{product.sku || 'No SKU'}</p>
                                                </div>
                                            </div>
                                            <span className="font-semibold text-gray-900">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                                            <div className="flex gap-2">
                                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {product.type}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-16 text-gray-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium text-gray-500">No products found matching your criteria</p>
                                    <button
                                        onClick={() => setColumns(prev => prev.map(c => ({ ...c, filterValue: '' })))}
                                        className="mt-4 text-[#FF9500] text-sm font-black hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}

                            {/* Add Product Row */}
                            <button
                                onClick={() => { resetForm(); setShowAddModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#FF9500] transition-colors border-b border-gray-100 text-left"
                            >
                                <div className="w-10 flex justify-center">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[11px]">Add new item</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product / Service" size="lg">
                <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleAddProduct}
                    isSubmitting={isSubmitting}
                    onCancel={() => { setShowAddModal(false); resetForm(); }}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product" size="lg">
                <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleEditProduct}
                    isEdit
                    isSubmitting={isSubmitting}
                    onCancel={() => { setShowEditModal(false); resetForm(); }}
                />
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Product">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Delete "{selectedProduct?.name}"?
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDeleteProduct}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Delete
                        </motion.button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const ProductForm = ({
    formData,
    setFormData,
    onSubmit,
    isEdit = false,
    isSubmitting,
    onCancel
}: {
    formData: any;
    setFormData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isEdit?: boolean;
    isSubmitting: boolean;
    onCancel: () => void;
}) => (
    <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Product Identity */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#FF9500] mb-2">
                    <Package className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Product Information</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Product Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF9500] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                            placeholder="เช่น Professional Consulting, Enterprise Solution"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF9500] transition-all text-sm outline-none appearance-none"
                            >
                                <option value="SERVICE">Service</option>
                                <option value="INVENTORY">Inventory</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                                <Tag size={12} />
                                SKU
                            </label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF9500] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                                placeholder="PRO-001"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                            Status
                        </label>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Available for deals</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF9500]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Pricing & Details */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Filter className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Pricing & Details</h3>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                        <label className="block text-xs font-bold text-blue-600 uppercase mb-2 ml-1">Price (THB) *</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold">฿</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full h-12 pl-10 pr-4 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-lg font-bold text-gray-900 outline-none"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-[148px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF9500] focus:bg-white focus:border-transparent transition-all text-sm outline-none resize-none"
                            placeholder="ระบุรายละเอียดสินค้าหรือบริการที่นี่..."
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
                <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                >
                    Cancel
                </button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#FF9500] to-[#FFAC33] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:from-[#E68600] hover:to-[#FF9500] transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Plus size={18} />
                            <span>{isEdit ? 'Save Changes' : 'Add Product'}</span>
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    </form>
);
