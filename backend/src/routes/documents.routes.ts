import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, authorize, AuthRequest, getDealAccessFilter } from '../middleware/auth.middleware';
import { calculateDocumentTotals } from '../utils/calculation';

const router = Router();

// Standard Includes
const invoiceInclude = {
    items: true,
    receipt: true,
    deal: {
        select: {
            id: true,
            title: true,
            quotationNumber: true,
            quotationThemeColor: true,
            quotationVatRate: true,
            quotationWhtRate: true,
            owner: {
                select: { id: true, name: true, email: true }
            }
        }
    }
};

const receiptInclude = {
    invoice: {
        include: {
            items: true,
            deal: {
                select: {
                    id: true,
                    title: true,
                    quotationNumber: true,
                    quotationThemeColor: true,
                    quotationVatRate: true,
                    quotationWhtRate: true,
                    quotationDiscount: true,
                    owner: {
                        select: { id: true, name: true, email: true }
                    }
                }
            }
        }
    }
};

router.use(authenticate);

// Generate Invoice from Deal
router.post('/deals/:id/invoice', async (req: AuthRequest, res, next) => {
    try {
        const dealId = String(req.params.id);
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `IV-${year}${month}`;

        // 1. Fetch all data in parallel - only select needed fields
        const [deal, settings, lastInvoice] = await Promise.all([
            prisma.deal.findUnique({
                where: { id: dealId },
                select: {
                    id: true,
                    value: true,
                    quotationDiscount: true,
                    quotationVatRate: true,
                    quotationWhtRate: true,
                    quotationCustomerName: true,
                    quotationCustomerAddress: true,
                    quotationCustomerTaxId: true,
                    quotationCustomerPhone: true,
                    quotationCustomerEmail: true,
                    quotationTerms: true,
                    notes: true,
                    creditTerm: true,
                    invoice: { select: { id: true } }, // Only need to check existence
                    items: {
                        select: {
                            quantity: true,
                            price: true,
                            discount: true,
                            name: true,
                            description: true,
                            product: { select: { name: true, sku: true, description: true } }
                        }
                    },
                    contact: {
                        select: {
                            company: true,
                            firstName: true,
                            lastName: true,
                            address: true,
                            taxId: true,
                            phone: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.systemSetting.findMany({
                where: { key: { in: ['company_info', 'branding'] } },
                select: { key: true, value: true }
            }),
            prisma.invoice.findFirst({
                where: { invoiceNumber: { startsWith: prefix } },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            })
        ]);

        // Check access permissions
        const dealAccessCheck = await prisma.deal.findFirst({
            where: { id: dealId, ...getDealAccessFilter(req.user) },
            select: { id: true }
        });

        if (!dealAccessCheck) {
            return res.status(403).json({ error: 'Access denied to this deal' });
        }

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        if (deal.invoice) {
            return res.status(400).json({ error: 'Invoice already exists for this deal', invoiceId: deal.invoice.id });
        }

        // Generate running number
        let runningNumber = 1;
        if (lastInvoice) {
            const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
            if (!isNaN(lastNum)) runningNumber = lastNum + 1;
        }

        const invoiceNumber = `${prefix}-${String(runningNumber).padStart(4, '0')}`;

        const invoiceItemsData = deal.items.map(item => {
            const lineAmount = (item.quantity * item.price) - item.discount;
            return {
                description: JSON.stringify({
                    sku: item.product?.sku || null,
                    name: item.name || item.product?.name || 'Unknown Item',
                    productDescription: item.description || item.product?.description || null
                }),
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount,
                amount: lineAmount
            };
        });

        const totals = calculateDocumentTotals(
            invoiceItemsData,
            deal.quotationDiscount || 0,
            deal.quotationVatRate || 7,
            deal.quotationWhtRate || 0,
            deal.items.length === 0 ? deal.value : undefined
        );

        const calculatedSubtotal = totals.subtotal;
        const totalDiscount = totals.totalDiscount;
        const vatRate = totals.vatRate;
        const vatAmount = totals.vatAmount;
        const grandTotal = totals.grandTotal;
        const whtRate = totals.whtRate;
        const whtAmount = totals.whtAmount;
        const netTotal = totals.netTotal;

        // Due date (default 30 days)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (deal.creditTerm || 30));

        // Get company info from settings
        const brandingSetting = settings.find(s => s.key === 'branding');
        const companyInfoSetting = settings.find(s => s.key === 'company_info');

        let companyInfo: any = {};
        if (companyInfoSetting) {
            try {
                companyInfo = JSON.parse(companyInfoSetting.value);
            } catch (e) {
                console.error('Failed to parse company_info', e);
            }
        }

        const companyName = companyInfo.company_name_th || '';
        const companyAddress = companyInfo.company_address_th || '';
        const companyTaxId = companyInfo.company_tax_id || '';
        const companyPhone = companyInfo.company_phone || '';

        // STRICT COPY from Quotation Data
        // If quotation was customized, use that. Fallback to Contact ONLY if quotation fields are empty (which shouldn't happen if flow is followed)
        const customerName = deal.quotationCustomerName || deal.contact?.company || ((deal.contact?.firstName || '') + ' ' + (deal.contact?.lastName || '')).trim() || 'N/A';
        const customerAddress = deal.quotationCustomerAddress || deal.contact?.address || '';
        const customerTaxId = deal.quotationCustomerTaxId || deal.contact?.taxId || '';
        const customerPhone = deal.quotationCustomerPhone || deal.contact?.phone;
        const customerEmail = deal.quotationCustomerEmail || deal.contact?.email;
        const notes = deal.quotationTerms || deal.notes; // Pull Terms into Invoice Notes by default

        // Create Invoice with all data in one transaction
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                date: new Date(),
                dueDate: dueDate,
                status: 'DRAFT', // Always start as Draft

                companyName,
                companyAddress,
                companyTaxId,
                companyPhone,

                // Customer Info Copied
                customerName,
                customerAddress,
                customerTaxId,
                customerPhone,
                customerEmail,

                notes,

                // Financials
                subtotal: calculatedSubtotal,
                discount: totalDiscount,
                vatRate: vatRate,
                vatAmount: vatAmount,
                grandTotal: grandTotal,
                whtRate: whtRate,
                whtAmount: whtAmount,
                netTotal: netTotal,

                items: {
                    create: invoiceItemsData
                },

                dealId: deal.id
            },
            select: {
                id: true,
                invoiceNumber: true,
                date: true,
                dueDate: true,
                customerName: true,
                grandTotal: true,
                netTotal: true,
                items: true
            }
        });

        res.status(201).json(invoice);

    } catch (error: any) {
        console.error('Convert Invoice Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate invoice' });
    }
});

// Get Invoice (Auto-sync for DRAFT)
router.get('/invoices/:id', async (req: AuthRequest, res, next) => {
    try {
        const id = String(req.params.id);
        let invoice = await prisma.invoice.findUnique({
            where: { id },
            include: invoiceInclude
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // AUTOMATIC SYNC: If in DRAFT, pull latest from Deal/Quotation automatically
        if (invoice.status === 'DRAFT' && invoice.dealId) {
            const deal = await prisma.deal.findUnique({
                where: { id: invoice.dealId },
                include: { items: { include: { product: true } } }
            });

            if (deal) {
                const itemData = deal.items.map(item => ({
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

                const totals = calculateDocumentTotals(
                    itemData,
                    deal.quotationDiscount || 0,
                    deal.quotationVatRate || 7,
                    deal.quotationWhtRate || 0
                );

                invoice = await prisma.invoice.update({
                    where: { id },
                    data: {
                        items: { deleteMany: {}, create: itemData },
                        subtotal: totals.subtotal,
                        discount: totals.totalDiscount,
                        vatRate: totals.vatRate,
                        vatAmount: totals.vatAmount,
                        grandTotal: totals.grandTotal,
                        whtRate: totals.whtRate,
                        whtAmount: totals.whtAmount,
                        netTotal: totals.netTotal,
                        customerName: deal.quotationCustomerName || invoice.customerName,
                        customerAddress: deal.quotationCustomerAddress || invoice.customerAddress,
                        customerTaxId: deal.quotationCustomerTaxId || invoice.customerTaxId,
                        customerPhone: deal.quotationCustomerPhone || invoice.customerPhone,
                        customerEmail: deal.quotationCustomerEmail || invoice.customerEmail,
                        dueDate: deal.quotationDate ? new Date(new Date(deal.quotationDate).getTime() + (deal.creditTerm || 30) * 24 * 60 * 60 * 1000) : invoice.dueDate,
                    },
                    include: invoiceInclude
                });
            }
        }

        res.json(invoice);
    } catch (error) {
        console.error('Get Invoice Error:', error);
        next(error);
    }
});


// Update Invoice
router.put('/invoices/:id', async (req: AuthRequest, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const {
            customerName,
            customerAddress,
            customerTaxId,
            customerPhone,
            customerEmail,
            subtotal,
            discount,
            vatRate,
            vatAmount,
            grandTotal,
            whtRate,
            whtAmount,
            netTotal,
            notes,
            status
        } = req.body;

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // Enforce Locking: Only allow edits if DRAFT or if we are explicitly changing the status (e.g. reverting)
        if (invoice.status !== 'DRAFT' && !status) {
            return res.status(400).json({ error: 'Cannot edit a confirmed invoice. Revert to draft first.' });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                ...(customerName !== undefined && { customerName }),
                ...(customerAddress !== undefined && { customerAddress }),
                ...(customerTaxId !== undefined && { customerTaxId }),
                ...(customerPhone !== undefined && { customerPhone }),
                ...(customerEmail !== undefined && { customerEmail }),
                ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) }),
                ...(discount !== undefined && { discount: parseFloat(discount) }),
                ...(vatRate !== undefined && { vatRate: parseFloat(vatRate) }),
                ...(vatAmount !== undefined && { vatAmount: parseFloat(vatAmount) }),
                ...(grandTotal !== undefined && { grandTotal: parseFloat(grandTotal) }),
                ...(whtRate !== undefined && { whtRate: parseFloat(whtRate) }),
                ...(whtAmount !== undefined && { whtAmount: parseFloat(whtAmount) }),
                ...(netTotal !== undefined && { netTotal: parseFloat(netTotal) }),
                ...(notes !== undefined && { notes }),
                ...(status !== undefined && { status }),
            },
            include: invoiceInclude
        });
        res.json(updatedInvoice);
    } catch (error) {
        next(error);
    }
});


// Sync Invoice items from Deal
router.post('/invoices/:id/sync-items', async (req: AuthRequest, res, next) => {
    try {
        const invoiceId = String(req.params.id);

        // 1. Fetch Invoice with its Deal and Quotation data
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                deal: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!invoice.deal) return res.status(400).json({ error: 'Invoice has no associated deal' });
        if (invoice.status !== 'DRAFT') {
            return res.status(400).json({ error: 'Only DRAFT invoices can be synced' });
        }

        const deal = invoice.deal;

        // 2. Map DealItems to InvoiceItems structure
        const itemData = deal.items.map(item => {
            const lineAmount = (item.quantity * item.price) - (item.discount || 0);

            // Build document-specific description snapshot
            const descriptionObj = {
                sku: item.product?.sku || null,
                name: item.name || item.product?.name || 'Unknown Item',
                productDescription: item.description || item.product?.description || null
            };

            return {
                description: JSON.stringify(descriptionObj),
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount || 0,
                amount: lineAmount
            };
        });

        // 3. Calculate new totals using Deal's quotation parameters
        const totals = calculateDocumentTotals(
            itemData,
            deal.quotationDiscount || 0,
            deal.quotationVatRate || 7,
            deal.quotationWhtRate || 0
        );

        // 4. Atomic update: Clear old items, create new ones, and update all quotation metadata
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                // Update items
                items: {
                    deleteMany: {},
                    create: itemData
                },
                // Sync Financial Totals
                subtotal: totals.subtotal,
                discount: totals.totalDiscount,
                vatAmount: totals.vatAmount,
                grandTotal: totals.grandTotal,
                whtAmount: totals.whtAmount,
                netTotal: totals.netTotal,

                // Sync Quotation Parameters (Rates & Terms)
                vatRate: deal.quotationVatRate || 7,
                whtRate: deal.quotationWhtRate || 0,
                // Due date might need recalculation based on current or quotation date
                dueDate: deal.quotationDate ? new Date(new Date(deal.quotationDate).getTime() + (deal.creditTerm || 30) * 24 * 60 * 60 * 1000) : invoice.dueDate,

                // Sync Customer Snapshot from Quotation
                customerName: deal.quotationCustomerName || invoice.customerName,
                customerAddress: deal.quotationCustomerAddress || invoice.customerAddress,
                customerTaxId: deal.quotationCustomerTaxId || invoice.customerTaxId,
                customerPhone: deal.quotationCustomerPhone || invoice.customerPhone,
                customerEmail: deal.quotationCustomerEmail || invoice.customerEmail
            },
            include: invoiceInclude
        });

        res.json(updatedInvoice);
    } catch (error) {
        console.error('Sync Items Error:', error);
        next(error);
    }
});
// Confirm Invoice (New)
router.post('/invoices/:id/confirm', async (req: AuthRequest, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const now = new Date();

        // 1. Check current status
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { id: true, status: true, confirmedAt: true }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // 2. Idempotency: If already confirmed (SENT or PAID), return full object
        if ((invoice.status === 'SENT' || invoice.status === 'PAID') && invoice.confirmedAt) {
            const fullInvoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: invoiceInclude
            });
            return res.json(fullInvoice);
        }

        // 3. Update Status
        // If it was DRAFT, move to SENT. If it was already PAID (but somehow missing confirmedAt), keep it PAID?
        // Usually, the flow is DRAFT -> SENT.  Cancellation is separate.
        // We force it to SENT unless it's already PAID.

        let newStatus = 'SENT';
        if (invoice.status === 'PAID') newStatus = 'PAID';

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: newStatus as any,
                confirmedAt: now,
            }
        });

        // 4. Return full object
        const updated = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: invoiceInclude
        });

        console.log(`[Confirm Invoice] Success. ID: ${invoiceId}, Status: ${newStatus}`);
        res.json(updated);

    } catch (error) {
        console.error('[Confirm Invoice] Error:', error);
        next(error);
    }
});

// Generate Receipt from Invoice
router.post('/invoices/:id/receipt', async (req: AuthRequest, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const date = new Date();
        const yearBase = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `RE-${yearBase}${month}`;


        // 1. Fetch Invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { receipt: true }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // Enforce Flow: Invoice MUST be confirmed (Status != DRAFT)
        if (invoice.status === 'DRAFT') {
            return res.status(400).json({ error: 'Please confirm the Invoice before creating a Receipt.' });
        }

        if (invoice.receipt) {
            return res.status(400).json({
                error: 'Receipt already exists for this invoice',
                receiptId: invoice.receipt.id
            });
        }


        // 2. Prepare Receipt Number
        const lastReceipt = await prisma.receipt.findFirst({
            where: { receiptNumber: { startsWith: prefix } },
            orderBy: { receiptNumber: 'desc' },
            select: { receiptNumber: true }
        });

        let runningNumber = 1;
        if (lastReceipt) {
            const lastNum = parseInt(lastReceipt.receiptNumber.split('-')[2]);
            if (!isNaN(lastNum)) runningNumber = lastNum + 1;
        }

        const receiptNumber = `${prefix}-${String(runningNumber).padStart(4, '0')}`;

        // 3. Create Receipt
        const receipt = await prisma.receipt.create({
            data: {
                receiptNumber,
                date: new Date(),
                status: 'DRAFT',

                // Snapshot from Invoice
                companyName: invoice.companyName,
                companyAddress: invoice.companyAddress,
                companyTaxId: invoice.companyTaxId,
                companyPhone: invoice.companyPhone,

                customerName: invoice.customerName,
                customerAddress: invoice.customerAddress,
                customerTaxId: invoice.customerTaxId,
                customerPhone: invoice.customerPhone,
                customerEmail: invoice.customerEmail,

                notes: invoice.notes,

                grandTotal: invoice.grandTotal,
                whtAmount: invoice.whtAmount || 0,
                netTotal: invoice.netTotal,

                invoiceId: invoice.id
            },
            include: receiptInclude
        });

        res.status(201).json(receipt);

    } catch (error) {
        console.error('Create Receipt Error:', error);
        next(error);
    }
});

// Get Receipt
router.get('/receipts/:id', async (req: AuthRequest, res, next) => {
    try {
        const receipt = await prisma.receipt.findUnique({
            where: { id: String(req.params.id) },
            include: receiptInclude
        });
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

        res.json(receipt);
    } catch (error) {
        next(error);
    }
});

// Update Receipt
router.put('/receipts/:id', async (req: AuthRequest, res, next) => {
    try {
        const receiptId = String(req.params.id);
        const {
            customerName,
            customerAddress,
            customerTaxId,
            customerPhone,
            customerEmail,
            grandTotal,
            whtAmount,
            netTotal,
            paymentMethod,
            date,
            paymentDate,
            notes,
            status
        } = req.body;

        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId }
        });

        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

        // Enforce Locking
        if (receipt.status !== 'DRAFT' && !status) {
            return res.status(400).json({ error: 'Cannot edit a confirmed receipt. Revert to draft first.' });
        }

        const updatedReceipt = await prisma.receipt.update({
            where: { id: receiptId },
            data: {
                ...(customerName !== undefined && { customerName }),
                ...(customerAddress !== undefined && { customerAddress }),
                ...(customerTaxId !== undefined && { customerTaxId }),
                ...(customerPhone !== undefined && { customerPhone }),
                ...(customerEmail !== undefined && { customerEmail }),
                ...(grandTotal !== undefined && { grandTotal: parseFloat(grandTotal) }),
                ...(whtAmount !== undefined && { whtAmount: parseFloat(whtAmount) }),
                ...(netTotal !== undefined && { netTotal: parseFloat(netTotal) }),
                ...(date !== undefined && { date: new Date(date) }),
                ...(paymentDate !== undefined && { paymentDate: new Date(paymentDate) }),
                ...(paymentMethod !== undefined && { paymentMethod }),
                ...(notes !== undefined && { notes }),
                ...(status !== undefined && { status }),
            },
            include: receiptInclude
        });
        res.json(updatedReceipt);
    } catch (error) {
        next(error);
    }
});

// Confirm Receipt
router.post('/receipts/:id/confirm', async (req: AuthRequest, res, next) => {
    try {
        const receiptId = String(req.params.id);
        const now = new Date();

        // 1. Check existence and current status
        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId }
        });

        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

        // 2. Idempotency: If already confirmed, ensure we return the FULL object with relations
        if (receipt.status === 'ISSUED' && receipt.confirmedAt) {
            const fullReceipt = await prisma.receipt.findUnique({
                where: { id: receiptId },
                include: receiptInclude
            });
            return res.json(fullReceipt);
        }

        // 3. Perform Updates using Transaction
        // We update the Receipt AND the Invoice
        await prisma.$transaction([
            prisma.receipt.update({
                where: { id: receiptId },
                data: {
                    status: 'ISSUED',
                    confirmedAt: now,
                }
            }),
            prisma.invoice.update({
                where: { id: receipt.invoiceId },
                data: { status: 'PAID' }
            })
        ]);

        // 4. Fetch the final result with ALL relations needed for the frontend
        const finalReceipt = await prisma.receipt.findUnique({
            where: { id: receiptId },
            include: receiptInclude
        });

        console.log(`[Confirm Receipt] Success. ID: ${receiptId}, Time: ${now}`);
        res.json(finalReceipt);

    } catch (error) {
        console.error('[Confirm Receipt] Route Error:', error);
        next(error);
    }
});

export default router;
