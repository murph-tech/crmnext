export interface CalculationResult {
    subtotal: number;
    discount: number;
    afterDiscount: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    whtRate: number;
    whtAmount: number;
    netTotal: number;
}
export declare const calculateDocumentTotals: (items: {
    price?: number;
    unitPrice?: number;
    quantity: number;
    discount?: number;
    amount?: number;
}[], globalDiscount?: number, vatRate?: number, whtRate?: number, manualSubtotal?: number) => CalculationResult;
//# sourceMappingURL=calculation.d.ts.map