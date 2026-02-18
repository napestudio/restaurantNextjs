export interface ManualInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // VAT-inclusive
  vatRate: number; // 0, 10.5, 21, 27
}
