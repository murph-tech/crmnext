"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDocumentTotals = void 0;
const calculateDocumentTotals = (items, globalDiscount = 0, vatRate = 7, whtRate = 0, manualSubtotal) => {
    let subtotal = 0;
    if (items && items.length > 0) {
        subtotal = items.reduce((sum, item) => {
            // If item has an explicit 'amount', use it (e.g. receipt items typically have 'amount')
            // Otherwise calculate from price * quantity - discount
            if (item.amount !== undefined)
                return sum + item.amount;
            const price = item.price || item.unitPrice || 0;
            const lineAmount = (item.quantity * price) - (item.discount || 0);
            return sum + lineAmount;
        }, 0);
    }
    else if (manualSubtotal !== undefined) {
        subtotal = manualSubtotal;
    }
    const afterDiscount = subtotal - globalDiscount;
    // VAT is calculated on afterDiscount
    const vatAmount = afterDiscount * (vatRate / 100);
    const grandTotal = afterDiscount + vatAmount;
    // WHT is calculated on afterDiscount (usually before VAT, but WHT deduction logic varies. 
    // Standard Thailand WHT is on the base amount before VAT.)
    const whtAmount = afterDiscount * (whtRate / 100);
    const netTotal = grandTotal - whtAmount;
    return {
        subtotal,
        discount: globalDiscount,
        afterDiscount,
        vatRate,
        vatAmount,
        grandTotal,
        whtRate,
        whtAmount,
        netTotal
    };
};
exports.calculateDocumentTotals = calculateDocumentTotals;
//# sourceMappingURL=calculation.js.map