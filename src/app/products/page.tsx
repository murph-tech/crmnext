'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Filter, Edit2, Trash2, Tag, Archive, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface Product {
    id: string;
    name: string;
    description?: string;
    sku?: string;
    price: number;
    type: 'INVENTORY' | 'SERVICE';
    isActive: boolean;
}

export default function ProductsPage() {
    const { token, user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INVENTORY' | 'SERVICE'>('ALL');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sku: '',
        price: '',
        type: 'SERVICE',
        isActive: true,
    });

    useEffect(() => {
        if (token) loadProducts();
    }, [token]);

    const loadProducts = async () => {
        try {
            // Admin check should be here or in layout render, but for now we just load
            const data = await api.getProducts(token!);
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'ALL' || product.type === filterType;
        return matchesSearch && matchesType;
    });

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
            await api.createProduct(token!, formData);
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
            await api.updateProduct(token!, selectedProduct.id, formData);
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
        }).format(value);
    };



    if (isLoading) {
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
                        Products & Services <span className="text-gray-400 font-normal text-sm ml-2">({products.length})</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer rounded-md hover:bg-white transition-all">
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setIsLoading(true);
                                    try {
                                        const { parseCsv } = await import('@/lib/csvHelper');
                                        const data = await parseCsv(file);

                                        let successCount = 0;
                                        for (const item of data) {
                                            try {
                                                const productType = (item.type || item.Type || 'SERVICE').toUpperCase();
                                                const productData = {
                                                    name: item.name || item.Name || 'Unknown Product',
                                                    description: item.description || item.Description,
                                                    sku: item.sku || item.Sku || item.SKU,
                                                    price: parseFloat(item.price || item.Price || '0'),
                                                    type: productType === 'INVENTORY' ? 'INVENTORY' : 'SERVICE',
                                                    isActive: true
                                                };

                                                if (productData.name) {
                                                    await api.createProduct(token!, productData);
                                                    successCount++;
                                                }
                                            } catch (err) {
                                                console.warn('Failed to import row:', item, err);
                                            }
                                        }

                                        alert(`Successfully imported ${successCount} products.`);
                                        loadProducts();
                                    } catch (error) {
                                        console.error('Import failed:', error);
                                        alert('Failed to import file.');
                                    } finally {
                                        setIsLoading(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <span>Import</span>
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    const { exportToCsv } = await import('@/lib/csvHelper');
                                    const exportData = products.map(p => ({
                                        name: p.name,
                                        description: p.description,
                                        sku: p.sku,
                                        price: p.price,
                                        type: p.type,
                                        isActive: p.isActive,
                                        id: p.id
                                    }));
                                    exportToCsv(exportData, `products-export-${new Date().toISOString().split('T')[0]}.csv`);
                                } catch (error) {
                                    console.error('Export failed:', error);
                                }
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-white transition-all"
                        >
                            Export
                        </button>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
                            placeholder="Search products..."
                            className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9500]/20 w-64"
                        />
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {['ALL', 'SERVICE', 'INVENTORY'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === type
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {type.charAt(0) + type.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Products Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_2fr_120px_1fr_1fr_100px_80px] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div className="flex justify-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#FF9500] focus:ring-[#FF9500]" />
                    </div>
                    <div>Product Name</div>
                    <div className="text-center">Type</div>
                    <div>SKU</div>
                    <div className="text-right">Price</div>
                    <div className="text-center">Status</div>
                    <div>Action</div>
                </div>

                {/* Table Body */}
                <div className="overflow-y-auto flex-1">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-gray-500">No products found</p>
                            <p className="text-sm mt-1">Add items to build your catalog</p>
                        </div>
                    ) : (
                        filteredProducts.map((product, index) => (
                            <div key={product.id} className={`group grid grid-cols-[40px_2fr_120px_1fr_1fr_100px_80px] gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center text-sm ${!product.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                                <div className="flex justify-center">
                                    <input type="checkbox" className="rounded border-gray-300 text-[#FF9500] focus:ring-[#FF9500]" />
                                </div>

                                {/* Name & Icon */}
                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {product.type === 'SERVICE' ? <Tag size={16} /> : <Archive size={16} />}
                                    </div>
                                    <div className="truncate">
                                        <span className="font-medium text-gray-900 block truncate">{product.name}</span>
                                        {product.description && <span className="text-xs text-gray-500 truncate block">{product.description}</span>}
                                    </div>
                                </div>

                                {/* Type */}
                                <div className="text-center">
                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${product.type === 'SERVICE' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {product.type}
                                    </span>
                                </div>

                                {/* SKU */}
                                <div className="truncate text-gray-500 font-mono text-xs">
                                    {product.sku || '-'}
                                </div>

                                {/* Price */}
                                <div className="text-right font-medium text-gray-900">
                                    {formatCurrency(product.price)}
                                </div>

                                {/* Status */}
                                <div className="text-center">
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

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                                        className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                                        title="Edit"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowDeleteModal(true); }}
                                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Product Row */}
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#FF9500] transition-colors border-b border-gray-100 text-left"
                    >
                        <div className="w-10 flex justify-center">
                            <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                        </div>
                        <Plus size={16} />
                        <span className="font-medium">Add new item</span>
                    </button>
                </div>
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product / Service" size="md">
                <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleAddProduct}
                    isSubmitting={isSubmitting}
                    onCancel={() => { setShowAddModal(false); resetForm(); }}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product" size="md">
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
    <form onSubmit={onSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                required
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                >
                    <option value="SERVICE">Service</option>
                    <option value="INVENTORY">Inventory</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    placeholder="Optional"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (THB) *</label>
            <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                required
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-24 px-3 py-2 rounded-xl spotlight-input text-sm resize-none"
                placeholder="Product details..."
            />
        </div>

        {isEdit && (
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#007AFF] rounded focus:ring-[#007AFF]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible in deals)</label>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
            <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
                Cancel
            </button>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Product'}
            </motion.button>
        </div>
    </form>
);
