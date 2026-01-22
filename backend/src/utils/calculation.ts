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

const round = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

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
            const lineGross = round(item.quantity * price);
            const lineDiscount = item.discount || 0; // Assuming discount is already an absolute number

            grossSubtotal += lineGross;
            itemDiscount += lineDiscount;
        });
    } else if (manualSubtotal !== undefined) {
        grossSubtotal = manualSubtotal;
    }

    // Formatting/Rounding sums
    grossSubtotal = round(grossSubtotal);
    itemDiscount = round(itemDiscount);
    globalDiscount = round(globalDiscount);

    const totalDiscount = round(itemDiscount + globalDiscount);
    const afterDiscount = round(grossSubtotal - totalDiscount);

    // VAT is calculated on afterDiscount (Values must be rounded to 2 decimals)
    const vatAmount = round(afterDiscount * (vatRate / 100));
    const grandTotal = round(afterDiscount + vatAmount);

    // WHT is calculated on afterDiscount (usually before VAT)
    const whtAmount = round(afterDiscount * (whtRate / 100));

    // Net Total (Payment Amount)
    const netTotal = round(grandTotal - whtAmount);

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
