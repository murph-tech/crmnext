"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const calculation_1 = require("../utils/calculation");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Generate Invoice from Deal
router.post('/deals/:id/invoice', async (req, res, next) => {
    try {
        const dealId = String(req.params.id);
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `IV-${year}${month}`;
        // 1. Fetch all data in parallel - only select needed fields
        const [deal, settings, lastInvoice] = await Promise.all([
            index_1.prisma.deal.findUnique({
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
            index_1.prisma.systemSetting.findMany({
                where: { key: { in: ['company_name_th', 'company_address_th', 'company_tax_id', 'company_phone', 'company_email'] } },
                select: { key: true, value: true }
            }),
            index_1.prisma.invoice.findFirst({
                where: { invoiceNumber: { startsWith: prefix } },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            })
        ]);
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
            if (!isNaN(lastNum))
                runningNumber = lastNum + 1;
        }
        const invoiceNumber = `${prefix}-${String(runningNumber).padStart(4, '0')}`;
        const invoiceItemsData = deal.items.map(item => {
            const lineAmount = (item.quantity * item.price) - item.discount;
            return {
                description: JSON.stringify({
                    sku: item.product.sku || null,
                    name: item.name || item.product.name,
                    productDescription: item.description || item.product.description || null
                }),
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount,
                amount: lineAmount
            };
        });
        const totals = (0, calculation_1.calculateDocumentTotals)(invoiceItemsData, deal.quotationDiscount || 0, deal.quotationVatRate || 7, deal.quotationWhtRate || 0, deal.items.length === 0 ? deal.value : undefined);
        const calculatedSubtotal = totals.subtotal;
        const discount = totals.discount;
        // const afterDiscount = totals.afterDiscount;
        const vatRate = totals.vatRate;
        const vatAmount = totals.vatAmount;
        const grandTotal = totals.grandTotal;
        const whtRate = totals.whtRate;
        const whtAmount = totals.whtAmount;
        const netTotal = totals.netTotal;
        // Due date (default 30 days)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (deal.creditTerm || 30));
        // Get company info from settings (cached from parallel fetch)
        const settingsMap = Object.fromEntries(settings.map(s => {
            let val = s.value;
            try {
                val = JSON.parse(s.value);
            }
            catch (e) { }
            return [s.key, val];
        }));
        const companyName = settingsMap['company_name_th'] || 'บริษัท เมิร์ฟเทคโนโลยี จำกัด';
        const companyAddress = settingsMap['company_address_th'] || '69/43 หมู่ที่ 3 ตำบลบางใหญ่ อำเภอบางใหญ่ จ.นนทบุรี 11140';
        const companyTaxId = settingsMap['company_tax_id'] || '0-1055-67026-44-6';
        const companyPhone = settingsMap['company_phone'] || '086-588-9024';
        // STRICT COPY from Quotation Data
        // If quotation was customized, use that. Fallback to Contact ONLY if quotation fields are empty (which shouldn't happen if flow is followed)
        const customerName = deal.quotationCustomerName || deal.contact?.company || ((deal.contact?.firstName || '') + ' ' + (deal.contact?.lastName || '')).trim() || 'N/A';
        const customerAddress = deal.quotationCustomerAddress || deal.contact?.address || '';
        const customerTaxId = deal.quotationCustomerTaxId || deal.contact?.taxId || '';
        const customerPhone = deal.quotationCustomerPhone || deal.contact?.phone;
        const customerEmail = deal.quotationCustomerEmail || deal.contact?.email;
        const notes = deal.quotationTerms || deal.notes; // Pull Terms into Invoice Notes by default
        // Create Invoice with all data in one transaction
        const invoice = await index_1.prisma.invoice.create({
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
                discount: discount,
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
    }
    catch (error) {
        next(error);
    }
});
// Get Invoice
router.get('/invoices/:id', async (req, res, next) => {
    try {
        const invoice = await index_1.prisma.invoice.findUnique({
            where: { id: String(req.params.id) },
            include: {
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
            }
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    }
    catch (error) {
        next(error);
    }
});
// Update Invoice
router.put('/invoices/:id', async (req, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const { customerName, customerAddress, customerTaxId, customerPhone, customerEmail, subtotal, discount, vatRate, vatAmount, grandTotal, whtRate, whtAmount, netTotal, notes, status } = req.body;
        const invoice = await index_1.prisma.invoice.findUnique({
            where: { id: invoiceId }
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        // Allow editing for all statuses
        const updatedInvoice = await index_1.prisma.invoice.update({
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
            include: {
                items: true,
                receipt: true,
                deal: {
                    select: {
                        id: true,
                        title: true,
                        quotationNumber: true,
                        quotationThemeColor: true
                    }
                }
            }
        });
        res.json(updatedInvoice);
    }
    catch (error) {
        next(error);
    }
});
// Sync Invoice items from Deal
router.post('/invoices/:id/sync-items', async (req, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        // Get invoice with deal items
        const invoice = await index_1.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                items: true,
                deal: {
                    include: {
                        items: {
                            include: {
                                product: { select: { name: true, sku: true, description: true } }
                            }
                        }
                    }
                }
            }
        });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (!invoice.deal)
            return res.status(400).json({ error: 'Invoice has no associated deal' });
        // Delete existing invoice items
        await index_1.prisma.invoiceItem.deleteMany({
            where: { invoiceId: invoiceId }
        });
        // Calculate and create new items from deal
        let calculatedSubtotal = 0;
        const newItems = invoice.deal.items.map(item => {
            const lineAmount = (item.quantity * item.price) - item.discount;
            calculatedSubtotal += lineAmount;
            return {
                invoiceId: invoiceId,
                description: JSON.stringify({
                    sku: item.product.sku || null,
                    name: item.name || item.product.name,
                    productDescription: item.description || item.product.description || null
                }),
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount,
                amount: lineAmount
            };
        });
        // Insert new items
        if (newItems.length > 0) {
            await index_1.prisma.invoiceItem.createMany({
                data: newItems
            });
        }
        // Update invoice totals
        const totals = (0, calculation_1.calculateDocumentTotals)(newItems, invoice.discount || 0, invoice.vatRate || 7, invoice.whtRate || 0);
        const updatedInvoice = await index_1.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                subtotal: totals.subtotal,
                vatAmount: totals.vatAmount,
                grandTotal: totals.grandTotal,
                whtAmount: totals.whtAmount,
                netTotal: totals.netTotal
            },
            include: {
                items: true,
                deal: {
                    select: {
                        id: true,
                        title: true,
                        quotationNumber: true,
                        quotationThemeColor: true,
                        owner: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });
        res.json(updatedInvoice);
    }
    catch (error) {
        next(error);
    }
});
// Confirm Invoice (New)
router.post('/invoices/:id/confirm', async (req, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const invoice = await index_1.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status === 'SENT' || invoice.status === 'PAID') {
            return res.status(400).json({ error: 'Invoice already confirmed' });
        }
        const updated = await index_1.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'SENT', // Mark as Sent/Confirmed
                confirmedAt: new Date(), // Set timestamp
            }
        });
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
});
// Generate Receipt from Invoice
router.post('/invoices/:id/receipt', async (req, res, next) => {
    try {
        const invoiceId = String(req.params.id);
        const date = new Date();
        const yearBase = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `RE-${yearBase}${month}`;
        // 1. Fetch Invoice (only needed fields) and find last receipt in parallel
        const [invoice, lastReceipt] = await Promise.all([
            index_1.prisma.invoice.findUnique({
                where: { id: invoiceId },
                select: {
                    id: true,
                    companyName: true,
                    companyAddress: true,
                    companyTaxId: true,
                    companyPhone: true,
                    customerName: true,
                    customerAddress: true,
                    customerTaxId: true,
                    customerPhone: true,
                    customerEmail: true,
                    notes: true,
                    grandTotal: true,
                    whtAmount: true,
                    netTotal: true,
                    receipt: { select: { id: true } } // Only check if exists
                }
            }),
            index_1.prisma.receipt.findFirst({
                where: { receiptNumber: { startsWith: prefix } },
                orderBy: { receiptNumber: 'desc' },
                select: { receiptNumber: true }
            })
        ]);
        if (!invoice)
            return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.receipt)
            return res.status(400).json({ error: 'Receipt already exists', receiptId: invoice.receipt.id });
        // 2. Prepare Receipt Number
        let runningNumber = 1;
        if (lastReceipt) {
            const lastNum = parseInt(lastReceipt.receiptNumber.split('-')[2]);
            if (!isNaN(lastNum))
                runningNumber = lastNum + 1;
        }
        const receiptNumber = `${prefix}-${String(runningNumber).padStart(4, '0')}`;
        // 3. Create Receipt (Invoice status remains SENT until Receipt is Confirmed)
        const receipt = await index_1.prisma.receipt.create({
            data: {
                receiptNumber,
                date: new Date(),
                status: 'DRAFT', // Start as Draft
                // Copy from Invoice
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
                whtAmount: invoice.whtAmount,
                netTotal: invoice.netTotal,
                invoiceId: invoice.id
            },
            select: {
                id: true,
                receiptNumber: true,
                date: true,
                customerName: true,
                netTotal: true
            }
        });
        res.status(201).json(receipt);
    }
    catch (error) {
        next(error);
    }
});
// Get Receipt
router.get('/receipts/:id', async (req, res, next) => {
    try {
        const receipt = await index_1.prisma.receipt.findUnique({
            where: { id: String(req.params.id) },
            include: {
                invoice: {
                    include: {
                        items: {
                            orderBy: { id: 'asc' }
                        },
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
            }
        });
        if (!receipt)
            return res.status(404).json({ error: 'Receipt not found' });
        res.json(receipt);
    }
    catch (error) {
        next(error);
    }
});
// Update Receipt
router.put('/receipts/:id', async (req, res, next) => {
    try {
        const receiptId = String(req.params.id);
        const { customerName, customerAddress, customerTaxId, customerPhone, customerEmail, grandTotal, whtAmount, netTotal, paymentMethod, date, paymentDate, notes, status } = req.body;
        const receipt = await index_1.prisma.receipt.findUnique({
            where: { id: receiptId }
        });
        if (!receipt)
            return res.status(404).json({ error: 'Receipt not found' });
        const updatedReceipt = await index_1.prisma.receipt.update({
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
            include: {
                invoice: {
                    include: {
                        items: true,
                        deal: {
                            select: {
                                id: true,
                                title: true,
                                quotationNumber: true,
                                quotationThemeColor: true
                            }
                        }
                    }
                }
            }
        });
        res.json(updatedReceipt);
    }
    catch (error) {
        next(error);
    }
});
// Confirm Receipt (New)
router.post('/receipts/:id/confirm', async (req, res, next) => {
    try {
        const receiptId = String(req.params.id);
        const receipt = await index_1.prisma.receipt.findUnique({ where: { id: receiptId } });
        if (!receipt)
            return res.status(404).json({ error: 'Receipt not found' });
        if (receipt.status === 'ISSUED') {
            return res.status(400).json({ error: 'Receipt already confirmed' });
        }
        const updated = await index_1.prisma.receipt.update({
            where: { id: receiptId },
            data: {
                status: 'ISSUED',
                confirmedAt: new Date(),
                // Update Invoice to PAID when Receipt is confirmed? 
                // Or maybe just leave it? Let's update invoice for consistency if needed.
                // Actually the requirement was flow-based. 
            }
        });
        // Also update invoice status to PAID if it wasn't already?
        // The previous logic set sidebar status. Let's ensure Invoice is PAID.
        await index_1.prisma.invoice.update({
            where: { id: receipt.invoiceId },
            data: { status: 'PAID' }
        });
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=documents.routes.js.map