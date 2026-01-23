import { Router } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest, getOwnerFilter } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Get all companies with summary statistics
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search } = req.query;

        // Get contacts grouped by company with aggregated statistics
        const contacts = await prisma.contact.findMany({
            where: {
                ...getOwnerFilter(req.user),
                company: { not: null },
                ...(search && {
                    company: { contains: search as string, mode: 'insensitive' }
                }),
            },
            include: {
                deals: {
                    include: {
                        items: true,
                    },
                },
            },
        });

        // Group contacts by company and calculate statistics
        const companyMap = new Map<string, any>();

        contacts.forEach(contact => {
            const companyName = contact.company!;
            if (!companyMap.has(companyName)) {
                companyMap.set(companyName, {
                    name: companyName,
                    contactCount: 0,
                    activeDealsCount: 0,
                    wonDealsCount: 0,
                    totalDealsValue: 0,
                });
            }

            const company = companyMap.get(companyName);
            company.contactCount++;

            // Aggregate deal statistics
            contact.deals.forEach(deal => {
                // Calculate deal value from items
                const dealValue = deal.items.reduce((sum, item) => {
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const discount = item.discount || 0;
                    return sum + (quantity * price * (1 - discount / 100));
                }, 0);

                company.totalDealsValue += dealValue;

                // Count active and won deals
                if (deal.stage === 'CLOSED_WON') {
                    company.wonDealsCount++;
                } else if (deal.stage !== 'CLOSED_LOST') {
                    company.activeDealsCount++;
                }
            });
        });

        // Convert map to array and sort by total deals value descending
        const companies = Array.from(companyMap.values())
            .sort((a, b) => b.totalDealsValue - a.totalDealsValue);

        res.json(companies);
    } catch (error) {
        next(error);
    }
});

// Get single company details
router.get('/:name', async (req: AuthRequest, res, next) => {
    try {
        const companyName = decodeURIComponent(req.params.name);

        // Get contacts for this company
        const contacts = await prisma.contact.findMany({
            where: {
                ...getOwnerFilter(req.user),
                company: companyName,
            },
            include: {
                _count: { select: { deals: true, activities: true } },
            },
        });

        // Get deals for contacts in this company
        const contactIds = contacts.map(c => c.id);
        const deals = await prisma.deal.findMany({
            where: {
                ...getOwnerFilter(req.user),
                contactId: { in: contactIds },
            },
            include: {
                contact: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        // Calculate summary statistics
        let totalDealsValue = 0;
        let activeDealsCount = 0;
        let wonDealsCount = 0;

        deals.forEach(deal => {
            // Calculate deal value from items
            const dealValue = deal.items.reduce((sum, item) => {
                const quantity = item.quantity || 1;
                const price = item.price || 0;
                const discount = item.discount || 0;
                return sum + (quantity * price * (1 - discount / 100));
            }, 0);

            totalDealsValue += dealValue;

            // Count active and won deals
            if (deal.stage === 'CLOSED_WON') {
                wonDealsCount++;
            } else if (deal.stage !== 'CLOSED_LOST') {
                activeDealsCount++;
            }
        });

        const companyDetail = {
            name: companyName,
            contacts,
            deals,
            summary: {
                contactCount: contacts.length,
                totalDealsValue,
                activeDealsCount,
                wonDealsCount,
            },
        };

        res.json(companyDetail);
    } catch (error) {
        next(error);
    }
});

export default router;