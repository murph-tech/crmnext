export interface CalculationResult {
    subtotal: number;       // Gross sum of (price * quantity)
    itemDiscount: number;   // Sum of all line item discounts
    discount: number;       // Global/Special discount
    totalDiscount: number;  // itemDiscount + discount
    afterDiscount: number;  // subtotal - totalDiscount
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    whtRate: number;
    whtAmount: number;
    netTotal: number;
}

export const calculateDocumentTotals = (
    items: {
        price?: number;
        unitPrice?: number;
        quantity: number;
        discount?: number;
        amount?: number;
    }[],
    globalDiscount: number = 0,
    vatRate: number = 7,
    whtRate: number = 0,
    manualSubtotal?: number
): CalculationResult => {
    let grossSubtotal = 0;
    let itemDiscount = 0;

    if (items && items.length > 0) {
        items.forEach(item => {
            const price = item.price || item.unitPrice || 0;
            const lineGross = item.quantity * price;
            const lineDiscount = item.discount || 0;

            grossSubtotal += lineGross;
            itemDiscount += lineDiscount;
        });
    } else if (manualSubtotal !== undefined) {
        grossSubtotal = manualSubtotal;
    }

    const totalDiscount = itemDiscount + globalDiscount;
    const afterDiscount = grossSubtotal - totalDiscount;

    // VAT is calculated on afterDiscount
    const vatAmount = afterDiscount * (vatRate / 100);
    const grandTotal = afterDiscount + vatAmount;

    // WHT is calculated on afterDiscount (usually before VAT)
    const whtAmount = afterDiscount * (whtRate / 100);
    const netTotal = grandTotal - whtAmount;

    return {
        subtotal: grossSubtotal,
        itemDiscount,
        discount: globalDiscount,
        totalDiscount,
        afterDiscount,
        vatRate,
        vatAmount,
        grandTotal,
        whtRate,
        whtAmount,
        netTotal
    };
};
