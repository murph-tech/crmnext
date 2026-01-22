import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest, getOwnerFilter, getDealAccessFilter } from '../middleware/auth.middleware';
import { calculateDocumentTotals } from '../utils/calculation';

/**
 * Helper to sync Invoice and Receipt data when Deal/Quotation is updated.
 */
const syncDocuments = async (dealId: string) => {
    try {
        // 1. Get Deal with Items
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                items: { include: { product: true } },
                invoice: { include: { receipt: true, items: true } }
            }
        });

        if (!deal || !deal.invoice) return; // Nothing to sync

        const invoice = deal.invoice;

        // Skip if invoice is Cancelled or Paid?
        // User wants "Modified Automatically", so we sync unless strictly forbidden.
        // Assuming we sync for DRAFT and maybe SENT/ISSUED if the user forces an edit on the deal.

        // 2. Map DealItems to InvoiceItems
        const invoiceItemsData = deal.items.map(item => ({
            description: JSON.stringify({
                sku: item.product?.sku || null,
                name: item.name || item.product?.name || 'Unknown Item',
                productDescription: item.description || item.product?.description || null
            }),
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount || 0,
            amount: (item.quantity * item.price) - (item.discount || 0)
        }));

        // 3. Calculate Totals
        const totals = calculateDocumentTotals(
            invoiceItemsData,
            deal.quotationDiscount || 0,
            deal.quotationVatRate || 7,
            deal.quotationWhtRate || 0
        );

        // 4. Update Invoice
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                // Replace Items
                items: {
                    deleteMany: {},
                    create: invoiceItemsData
                },
                // Update Totals
                subtotal: totals.subtotal,
                discount: totals.totalDiscount,
                vatRate: totals.vatRate,
                vatAmount: totals.vatAmount,
                grandTotal: totals.grandTotal,
                whtRate: totals.whtRate,
                whtAmount: totals.whtAmount,
                netTotal: totals.netTotal,

                // Sync Customer Fields
                customerName: deal.quotationCustomerName || invoice.customerName,
                customerAddress: deal.quotationCustomerAddress || invoice.customerAddress,
                customerTaxId: deal.quotationCustomerTaxId || invoice.customerTaxId,
                customerPhone: deal.quotationCustomerPhone || invoice.customerPhone,
                customerEmail: deal.quotationCustomerEmail || invoice.customerEmail
            }
        });

        // 5. Update Receipt if exists
        if (invoice.receipt) {
            await prisma.receipt.update({
                where: { id: invoice.receipt.id },
                data: {
                    // Sync Customer Fields
                    customerName: updatedInvoice.customerName,
                    customerAddress: updatedInvoice.customerAddress,
                    customerTaxId: updatedInvoice.customerTaxId,
                    customerPhone: updatedInvoice.customerPhone,
                    customerEmail: updatedInvoice.customerEmail,

                    // Sync Financials
                    grandTotal: updatedInvoice.grandTotal,
                    whtAmount: updatedInvoice.whtAmount,
                    netTotal: updatedInvoice.netTotal
                }
            });
        }
    } catch (error) {
        console.error('Error syncing documents:', error);
    }
};

const router = Router();

router.use(authenticate);

// Get all deals
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { stage, ownerId } = req.query;

        const deals = await prisma.deal.findMany({
            where: {
                ...getDealAccessFilter(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId as string } : {}),
                ...(stage && { stage: stage as any }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { id: true, firstName: true, lastName: true, company: true },
                },
                owner: {
                    select: { id: true, name: true, email: true },
                },
                salesTeam: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                _count: { select: { activities: true } },
            },
        });

        res.json(deals);
    } catch (error) {
        next(error);
    }
});

// Get deals by stage (for pipeline view)
router.get('/pipeline', async (req: AuthRequest, res, next) => {
    try {
        const { search } = req.query;
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

        const pipeline = await Promise.all(
            stages.map(async (stage) => {
                const deals = await prisma.deal.findMany({
                    where: {
                        ...getDealAccessFilter(req.user),
                        stage: stage as any,
                        ...(search && {
                            OR: [
                                { title: { contains: search as string } },
                                { contact: { firstName: { contains: search as string } } },
                                { contact: { lastName: { contains: search as string } } },
                                { contact: { company: { contains: search as string } } },
                            ],
                        }),
                    },
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        contact: {
                            select: { id: true, firstName: true, lastName: true, company: true },
                        },
                        owner: {
                            select: { id: true, name: true, email: true },
                        },
                        salesTeam: {
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                        activities: {
                            orderBy: { dueDate: 'asc' },
                            take: 10
                        },
                    },
                });

                const totalValue = deals.reduce(
                    (sum: number, deal: { value: any }) => sum + Number(deal.value),
                    0
                );

                return {
                    stage,
                    deals,
                    count: deals.length,
                    totalValue,
                };
            })
        );

        res.json(pipeline);
    } catch (error) {
        next(error);
    }
});

// Get single deal
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deal = await prisma.deal.findUnique({
            where: {
                id: req.params.id as string,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        company: true,
                        address: true,
                        taxId: true
                    }
                },
                owner: {
                    select: { id: true, name: true, email: true },
                },
                salesTeam: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 50, // Limit to recent 50 activities for performance
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        type: true,
                        completed: true,
                        duration: true,
                        dueDate: true,
                        reminderAt: true,
                        createdAt: true,
                        user: { select: { name: true, email: true } }
                    }
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        discount: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                sku: true,
                                price: true
                            }
                        }
                    }
                },
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        status: true,
                        receipt: { select: { id: true, receiptNumber: true } }
                    }
                },
            },
        });

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        // Custom Access Check
        const user = req.user;
        const isOwner = deal.ownerId === user?.id;
        const isSalesTeam = deal.salesTeam.some(m => m.id === user?.id);
        const isAdmin = user?.role === 'ADMIN';

        if (!isOwner && !isSalesTeam && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to view this deal' });
        }

        res.json(deal);
    } catch (error) {
        next(error);
    }
});

// Add item to deal
router.post('/:id/items', async (req: AuthRequest, res, next) => {
    try {
        const { productId, quantity, price, discount } = req.body;
        const dealId = req.params.id as string;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getOwnerFilter(req.user) },
        });

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        const item = await prisma.dealItem.create({
            data: {
                dealId: dealId,
                productId: productId as string,
                quantity: parseInt(quantity) || 1,
                price: parseFloat(price) || 0,
                discount: parseFloat(discount) || 0,
                name: req.body.name,
                description: req.body.description,
            },
            include: { product: true },
        });

        // Recalculate deal total value? (Optional: updating deal value based on items)
        // For now, let's keep it manual or separate logic, but typically CRM updates deal value.
        // Let's update deal value sum of items.
        const items = await prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity) - i.discount, 0);

        await prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });

        // Sync Invoice/Receipt
        await syncDocuments(dealId);

        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
});

// Remove item from deal
router.delete('/:id/items/:itemId', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;
        const itemId = req.params.itemId as string;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getOwnerFilter(req.user) },
        });

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        await prisma.dealItem.delete({
            where: { id: itemId },
        });

        // Recalculate deal value
        const items = await prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity) - i.discount, 0);

        await prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });

        // Sync Invoice/Receipt
        await syncDocuments(dealId);

        res.json({ message: 'Item removed' });
    } catch (error) {
        next(error);
    }
});

// Update deal item (price, quantity, discount)
router.put('/:id/items/:itemId', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;
        const itemId = req.params.itemId as string;
        const { price, quantity, discount, name, description } = req.body;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getOwnerFilter(req.user) },
        });

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        // Update the item
        await prisma.dealItem.update({
            where: { id: itemId },
            data: {
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(quantity !== undefined && { quantity: parseInt(quantity) }),
                ...(discount !== undefined && { discount: parseFloat(discount) }),
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
            },
        });

        // Recalculate deal value
        const items = await prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity) - i.discount, 0);

        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
            include: {
                items: { include: { product: true } },
                contact: true,
            }
        });

        // Sync Invoice/Receipt
        await syncDocuments(dealId);

        res.json(updatedDeal);
    } catch (error) {
        next(error);
    }
});

// Create deal
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const { title, value, currency, stage, probability, contactId, notes } = req.body;

        const deal = await prisma.deal.create({
            data: {
                title,
                value: parseFloat(value) || 0,
                currency: currency || 'THB',
                stage: stage || 'QUALIFIED',
                probability: probability || 20,
                notes,
                owner: { connect: { id: req.user!.id } },
                ...(contactId && { contact: { connect: { id: contactId } } }),
            },
        });

        res.status(201).json(deal);
    } catch (error) {
        next(error);
    }
});

// Update deal
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;

        // Check access first
        const existingDeal = await prisma.deal.findFirst({
            where: {
                id: dealId,
                ...getDealAccessFilter(req.user),
            }
        });

        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        const { salesTeamIds, ...otherData } = req.body;

        // If updating salesTeam, verify USER is the Owner (Manager) or ADMIN
        // The requester MUST be the owner or admin to add others.
        if (salesTeamIds) {
            const isOwner = existingDeal.ownerId === req.user!.id;
            const isAdmin = req.user!.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Only the Manager (Owner) can manage the Sales Team' });
            }
        }

        const deal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                ...otherData,
                ...(salesTeamIds && {
                    salesTeam: {
                        set: salesTeamIds.map((id: string) => ({ id })),
                    }
                })
            },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, email: true } },
                salesTeam: { select: { id: true, name: true, email: true, avatar: true } },
                items: { include: { product: true } },
                invoice: { select: { id: true, invoiceNumber: true } }
            }
        });

        // Sync Invoice/Receipt
        await syncDocuments(dealId);

        res.json(deal);
    } catch (error) {
        next(error);
    }
});

// Update deal stage (for drag-and-drop)
router.patch('/:id/stage', async (req: AuthRequest, res, next) => {
    try {
        const { stage } = req.body;

        const deal = await prisma.deal.updateMany({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
            data: {
                stage,
                ...(stage === 'CLOSED_WON' || stage === 'CLOSED_LOST'
                    ? { closedAt: new Date() }
                    : { closedAt: null }),
            },
        });

        if (deal.count === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        res.json({ message: 'Stage updated successfully' });
    } catch (error) {
        next(error);
    }
});

// Delete deal
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const deal = await prisma.deal.findFirst({
            where: {
                id: req.params.id as string,
                ...getOwnerFilter(req.user),
            },
        });

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        await prisma.deal.delete({
            where: { id: deal.id },
        });

        res.json({ message: 'Deal deleted successfully' });
    } catch (error) {
        next(error);
    }
});

import { stringify } from 'csv-stringify/sync';

// ... existing code ...

// Export deals to CSV
router.get('/export/csv', async (req: AuthRequest, res, next) => {
    try {
        const { stage, ownerId } = req.query;

        const deals = await prisma.deal.findMany({
            where: {
                ...getOwnerFilter(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId as string } : {}),
                ...(stage && { stage: stage as any }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                contact: {
                    select: { firstName: true, lastName: true, company: true, email: true, phone: true },
                },
                owner: {
                    select: { name: true, email: true },
                },
            },
        });

        const csvData = deals.map(deal => ({
            'Deal Name': deal.title,
            Value: deal.value,
            Currency: deal.currency,
            Stage: deal.stage,
            Probability: `${deal.probability}%`,
            'Contact Name': deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : '',
            Company: deal.contact?.company || '',
            'Contact Email': deal.contact?.email || '',
            'Contact Phone': deal.contact?.phone || '',
            Owner: deal.owner?.name || '',
            'Created At': new Date(deal.createdAt).toLocaleDateString(),
            Notes: deal.notes || '',
        }));

        const output = stringify(csvData, {
            header: true,
            columns: [
                'Deal Name', 'Value', 'Currency', 'Stage', 'Probability',
                'Contact Name', 'Company', 'Contact Email', 'Contact Phone',
                'Owner', 'Created At', 'Notes'
            ]
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=deals-export.csv');
        res.send(output);
    } catch (error) {
        next(error);
    }
});

// Generate Quotation
router.post('/:id/quotation', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;

        // 1. Fetch Deal and Company Settings in parallel
        const [deal, settings] = await Promise.all([
            prisma.deal.findUnique({ where: { id: dealId } }),
            prisma.systemSetting.findMany({
                where: { key: { in: ['company_info'] } }
            })
        ]);

        if (!deal) return res.status(404).json({ error: 'Deal not found' });

        // If already has quotation number, return full deal with relations
        if (deal.quotationNumber) {
            const existingDeal = await prisma.deal.findUnique({
                where: { id: dealId },
                include: {
                    contact: true,
                    owner: { select: { id: true, name: true, email: true } },
                    items: { include: { product: true } },
                }
            });
            return res.json(existingDeal);
        }

        // 2. Generate Running Number: QT-YYYYMM-XXXX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `QT-${year}${month}`;

        const latestDeal = await prisma.deal.findFirst({
            where: { quotationNumber: { startsWith: prefix } },
            orderBy: { quotationNumber: 'desc' }
        });

        let nextNum = 1;
        if (latestDeal && latestDeal.quotationNumber) {
            const parts = latestDeal.quotationNumber.split('-');
            if (parts.length === 3) {
                const lastNum = parseInt(parts[2]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        const quotationNumber = `${prefix}-${String(nextNum).padStart(4, '0')}`;

        // 3. Prepare Defaults from Settings
        const companyInfoSetting = settings.find(s => s.key === 'company_info');
        let companyInfo: any = {};
        if (companyInfoSetting) {
            try { companyInfo = JSON.parse(companyInfoSetting.value); } catch (e) { }
        }

        const defaultTerms = companyInfo.quotation_terms || '';

        const validUntil = new Date(now);
        validUntil.setDate(validUntil.getDate() + 30);

        console.log(`Generating Quotation: ${quotationNumber} for Deal ${dealId}`);

        // 4. Update Deal with Quotation Defaults
        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                quotationNumber,
                quotationDate: now,
                validUntil: validUntil,
                creditTerm: 30,
                quotationTerms: defaultTerms, // Auto-populate terms
                quotationStatus: 'DRAFT',
            },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, email: true } },
                items: { include: { product: true } },
            }
        });

        console.log('Quotation generated successfully');
        res.json(updatedDeal);
    } catch (error: any) {
        console.error('FAILED TO GENERATE QUOTATION:', error);
        res.status(500).json({
            error: 'Failed to generate quotation',
            details: error.message,
            stack: error.stack
        });
    }
});

// Approve Quotation (Customer Approval)
router.post('/:id/approve', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;

        // Verify deal exists and user has access
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getDealAccessFilter(req.user) },
        });

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        if (deal.quotationApproved) {
            return res.status(400).json({ error: 'Quotation already approved' });
        }

        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                quotationApproved: true,
                quotationApprovedAt: new Date(),
                quotationStatus: 'APPROVED', // Sync status
                stage: 'CLOSED_WON',
                closedAt: new Date(),
            },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, email: true } },
                items: { include: { product: true } },
                invoice: { select: { id: true, invoiceNumber: true } }
            }
        });

        res.json(updatedDeal);
    } catch (error) {
        next(error);
    }
});

// Delete Quotation (Reset to Draft Deal)
router.delete('/:id/quotation', async (req: AuthRequest, res, next) => {
    try {
        const dealId = req.params.id as string;

        // Verify deal exists and user has access
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, ...getDealAccessFilter(req.user) },
        });

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                quotationNumber: null,
                quotationDate: null,
                validUntil: null,
                quotationStatus: 'DRAFT',
                quotationApproved: false,
                quotationApprovedAt: null,
                quotationDiscount: 0,
                // quotationVatRate: 7, // Keep default settings
                // quotationWhtRate: 0,
            },
            include: {
                contact: true,
                owner: { select: { id: true, name: true, email: true } },
                items: { include: { product: true } },
            }
        });

        res.json(updatedDeal);
    } catch (error) {
        next(error);
    }
});

export default router;
