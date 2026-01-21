"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get all deals
router.get('/', async (req, res, next) => {
    try {
        const { stage, ownerId } = req.query;
        const deals = await index_1.prisma.deal.findMany({
            where: {
                ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
                ...(stage && { stage: stage }),
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
    }
    catch (error) {
        next(error);
    }
});
// Get deals by stage (for pipeline view)
router.get('/pipeline', async (req, res, next) => {
    try {
        const { search } = req.query;
        const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
        const pipeline = await Promise.all(stages.map(async (stage) => {
            const deals = await index_1.prisma.deal.findMany({
                where: {
                    ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
                    stage: stage,
                    ...(search && {
                        OR: [
                            { title: { contains: search } },
                            { contact: { firstName: { contains: search } } },
                            { contact: { lastName: { contains: search } } },
                            { contact: { company: { contains: search } } },
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
            const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
            return {
                stage,
                deals,
                count: deals.length,
                totalValue,
            };
        }));
        res.json(pipeline);
    }
    catch (error) {
        next(error);
    }
});
// Get single deal
router.get('/:id', async (req, res, next) => {
    try {
        const deal = await index_1.prisma.deal.findUnique({
            where: {
                id: req.params.id,
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
    }
    catch (error) {
        next(error);
    }
});
// Add item to deal
router.post('/:id/items', async (req, res, next) => {
    try {
        const { productId, quantity, price, discount } = req.body;
        const dealId = req.params.id;
        // Verify deal ownership
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getOwnerFilter)(req.user) },
        });
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        const item = await index_1.prisma.dealItem.create({
            data: {
                dealId: dealId,
                productId: productId,
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
        const items = await index_1.prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity) - i.discount, 0);
        await index_1.prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });
        res.status(201).json(item);
    }
    catch (error) {
        next(error);
    }
});
// Remove item from deal
router.delete('/:id/items/:itemId', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        const itemId = req.params.itemId;
        // Verify deal ownership
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getOwnerFilter)(req.user) },
        });
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        await index_1.prisma.dealItem.delete({
            where: { id: itemId },
        });
        // Recalculate deal value
        const items = await index_1.prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity) - i.discount, 0);
        await index_1.prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
        });
        res.json({ message: 'Item removed' });
    }
    catch (error) {
        next(error);
    }
});
// Update deal item (price, quantity, discount)
router.put('/:id/items/:itemId', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        const itemId = req.params.itemId;
        const { price, quantity, discount } = req.body;
        // Verify deal ownership
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getOwnerFilter)(req.user) },
        });
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        // Update the item
        await index_1.prisma.dealItem.update({
            where: { id: itemId },
            data: {
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(quantity !== undefined && { quantity: parseInt(quantity) }),
                ...(discount !== undefined && { discount: parseFloat(discount) }),
                ...(req.body.name !== undefined && { name: req.body.name }),
                ...(req.body.description !== undefined && { description: req.body.description }),
            },
        });
        // Recalculate deal value
        const items = await index_1.prisma.dealItem.findMany({ where: { dealId: dealId } });
        const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity) - i.discount, 0);
        const updatedDeal = await index_1.prisma.deal.update({
            where: { id: dealId },
            data: { value: totalValue },
            include: {
                items: { include: { product: true } },
                contact: true,
            }
        });
        res.json(updatedDeal);
    }
    catch (error) {
        next(error);
    }
});
// Create deal
router.post('/', async (req, res, next) => {
    try {
        const { title, value, currency, stage, probability, contactId, notes } = req.body;
        const deal = await index_1.prisma.deal.create({
            data: {
                title,
                value: parseFloat(value) || 0,
                currency: currency || 'THB',
                stage: stage || 'QUALIFIED',
                probability: probability || 20,
                notes,
                owner: { connect: { id: req.user.id } },
                ...(contactId && { contact: { connect: { id: contactId } } }),
            },
        });
        res.status(201).json(deal);
    }
    catch (error) {
        next(error);
    }
});
// Update deal
router.put('/:id', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        // Check access first
        const existingDeal = await index_1.prisma.deal.findFirst({
            where: {
                id: dealId,
                ...(0, auth_middleware_1.getDealAccessFilter)(req.user),
            }
        });
        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const { salesTeamIds, ...otherData } = req.body;
        // If updating salesTeam, verify USER is the Owner (Manager) or ADMIN
        // The requester MUST be the owner or admin to add others.
        if (salesTeamIds) {
            const isOwner = existingDeal.ownerId === req.user.id;
            const isAdmin = req.user.role === 'ADMIN';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Only the Manager (Owner) can manage the Sales Team' });
            }
        }
        const deal = await index_1.prisma.deal.update({
            where: { id: dealId },
            data: {
                ...otherData,
                ...(salesTeamIds && {
                    salesTeam: {
                        set: salesTeamIds.map((id) => ({ id })),
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
        res.json(deal);
    }
    catch (error) {
        next(error);
    }
});
// Update deal stage (for drag-and-drop)
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const { stage } = req.body;
        const deal = await index_1.prisma.deal.updateMany({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
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
    }
    catch (error) {
        next(error);
    }
});
// Delete deal
router.delete('/:id', async (req, res, next) => {
    try {
        const deal = await index_1.prisma.deal.findFirst({
            where: {
                id: req.params.id,
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
            },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        await index_1.prisma.deal.delete({
            where: { id: deal.id },
        });
        res.json({ message: 'Deal deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
const sync_1 = require("csv-stringify/sync");
// ... existing code ...
// Export deals to CSV
router.get('/export/csv', async (req, res, next) => {
    try {
        const { stage, ownerId } = req.query;
        const deals = await index_1.prisma.deal.findMany({
            where: {
                ...(0, auth_middleware_1.getOwnerFilter)(req.user),
                ...(ownerId && req.user?.role === 'ADMIN' ? { ownerId: ownerId } : {}),
                ...(stage && { stage: stage }),
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
        const output = (0, sync_1.stringify)(csvData, {
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
    }
    catch (error) {
        next(error);
    }
});
// Generate Quotation
router.post('/:id/quotation', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        // 1. Fetch Deal and Company Settings in parallel
        const [deal, settings] = await Promise.all([
            index_1.prisma.deal.findUnique({ where: { id: dealId } }),
            index_1.prisma.systemSetting.findMany({
                where: { key: { in: ['company_name_th', 'company_address_th', 'company_tax_id', 'company_phone', 'company_email', 'quotation_terms'] } }
            })
        ]);
        if (!deal)
            return res.status(404).json({ error: 'Deal not found' });
        // If already has quotation number, return full deal with relations
        if (deal.quotationNumber) {
            const existingDeal = await index_1.prisma.deal.findUnique({
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
        const latestDeal = await index_1.prisma.deal.findFirst({
            where: { quotationNumber: { startsWith: prefix } },
            orderBy: { quotationNumber: 'desc' }
        });
        let nextNum = 1;
        if (latestDeal && latestDeal.quotationNumber) {
            const parts = latestDeal.quotationNumber.split('-');
            if (parts.length === 3) {
                const lastNum = parseInt(parts[2]);
                if (!isNaN(lastNum))
                    nextNum = lastNum + 1;
            }
        }
        const quotationNumber = `${prefix}-${String(nextNum).padStart(4, '0')}`;
        // 3. Prepare Defaults from Settings
        const settingsMap = Object.fromEntries(settings.map(s => {
            // Parse JSON string value for simple strings? No, keys like company_name_th are usually strings.
            // But existing code showed JSON.parse logic. Let's be safe.
            let val = s.value;
            try {
                val = JSON.parse(s.value);
            }
            catch (e) { }
            return [s.key, val];
        }));
        const defaultTerms = settingsMap['quotation_terms'] || `หากมีการเปลี่ยนแปลงรายละเอียดของสินค้า/บริการ อาจมีผลต่อราคาที่เสนอ\nบริษัท ขอสงวนสิทธิ์ในการเปลี่ยนแปลงและแก้ไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า\nหากยกเลิกคำสั่งซื้อหลังจากยืนยันแล้ว จะมีค่าอำเนียมการยกเลิก 10% ของราคารวม\nการเปลี่ยนแปลงคำสั่งซื้อต้องแจ้งให้บริษัทฯ ทราบล่วงหน้าอย่างน้อย 7 วัน\nหากชำระเงินล่าช้ากว่ากำหนด จะมีค่าปรับ 1.25 % ต่อเดือน หรือไม่เกิน 15% ต่อปี\nใบเสนอราคานี้ มีราคา 14 วัน`;
        const validUntil = new Date(now);
        validUntil.setDate(validUntil.getDate() + 30);
        console.log(`Generating Quotation: ${quotationNumber} for Deal ${dealId}`);
        // 4. Update Deal with Quotation Defaults
        const updatedDeal = await index_1.prisma.deal.update({
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
    }
    catch (error) {
        console.error('FAILED TO GENERATE QUOTATION:', error);
        res.status(500).json({
            error: 'Failed to generate quotation',
            details: error.message,
            stack: error.stack
        });
    }
});
// Approve Quotation (Customer Approval)
router.post('/:id/approve', async (req, res, next) => {
    try {
        const dealId = req.params.id;
        // Verify deal exists and user has access
        const deal = await index_1.prisma.deal.findFirst({
            where: { id: dealId, ...(0, auth_middleware_1.getDealAccessFilter)(req.user) },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        if (!deal.quotationNumber) {
            return res.status(400).json({ error: 'Quotation has not been generated yet' });
        }
        if (deal.quotationApproved) {
            return res.status(400).json({ error: 'Quotation already approved' });
        }
        const updatedDeal = await index_1.prisma.deal.update({
            where: { id: dealId },
            data: {
                quotationApproved: true,
                quotationApprovedAt: new Date(),
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=deals.routes.js.map