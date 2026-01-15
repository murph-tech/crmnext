import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all products
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, type, isActive } = req.query;

        const products = await prisma.product.findMany({
            where: {
                ...(type && { type: type as any }),
                ...(isActive !== undefined && { isActive: isActive === 'true' }),
                ...(search && {
                    OR: [
                        { name: { contains: search as string } },
                        { sku: { contains: search as string } },
                    ],
                }),
            },
            orderBy: { name: 'asc' },
        });

        res.json(products);
    } catch (error) {
        next(error);
    }
});

// Get single product
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id as string },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// Create product
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        // Check for admin role if needed (skipping for now based on simplicity)
        const { name, description, sku, price, type, isActive } = req.body;

        // Convert empty string SKU to null to avoid unique constraint violation
        const normalizedSku = sku && sku.trim() !== '' ? sku.trim() : null;

        const product = await prisma.product.create({
            data: {
                name,
                description: description || null,
                sku: normalizedSku,
                price: parseFloat(price) || 0,
                type: type || 'SERVICE',
                isActive: isActive ?? true,
            },
        });

        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
});

// Update product
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { sku, price, ...rest } = req.body;

        // Normalize SKU: convert empty string to null
        const normalizedSku = sku !== undefined
            ? (sku && sku.trim() !== '' ? sku.trim() : null)
            : undefined;

        const updated = await prisma.product.updateMany({
            where: { id: req.params.id as string },
            data: {
                ...rest,
                ...(normalizedSku !== undefined && { sku: normalizedSku }),
                ...(price !== undefined && { price: parseFloat(price) || 0 }),
            },
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = await prisma.product.findUnique({
            where: { id: req.params.id as string },
        });

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// Delete product
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deleted = await prisma.product.deleteMany({
            where: { id: req.params.id as string },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
