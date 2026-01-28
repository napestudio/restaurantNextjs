import PDFDocument from "pdfkit";

interface InvoicePDFParams {
  invoice: {
    number: number;
    type: number;
    date: Date;
    cae: string;
    caeFchVto: string;
    qrUrl: string;
  };
  business: {
    name: string;
    cuit: string;
  };
  customer: {
    name: string;
    docType: number;
    docNumber: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    vatAmount: number;
    total: number;
  };
  vatBreakdown: unknown;
}

export async function generateInvoicePDF(params: InvoicePDFParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text(params.business.name, { align: "center" });
      doc.fontSize(10).text(`CUIT: ${params.business.cuit}`, { align: "center" });
      doc.moveDown();

      // Invoice type
      const invoiceTypeNames: Record<number, string> = {
        1: "FACTURA A",
        6: "FACTURA B",
        11: "FACTURA C",
      };
      doc.fontSize(16).text(invoiceTypeNames[params.invoice.type] || "FACTURA", { align: "center" });
      doc.fontSize(10).text(`N° ${params.invoice.number.toString().padStart(8, "0")}`, { align: "center" });
      doc.moveDown();

      // Date and CAE
      doc.fontSize(10);
      doc.text(`Fecha: ${new Date(params.invoice.date).toLocaleDateString("es-AR")}`);
      doc.text(`CAE: ${params.invoice.cae}`);
      doc.text(`Venc. CAE: ${params.invoice.caeFchVto}`);
      doc.moveDown();

      // Customer info
      doc.text("CLIENTE:");
      doc.text(`Nombre: ${params.customer.name}`);
      doc.text(`Doc: ${params.customer.docType} - ${params.customer.docNumber}`);
      doc.moveDown();

      // Items table
      doc.text("DETALLE:", { underline: true });
      doc.moveDown(0.5);

      params.items.forEach((item) => {
        doc.text(
          `${item.quantity}x ${item.description}  $${item.unitPrice.toFixed(2)}  $${item.total.toFixed(2)}`
        );
      });
      doc.moveDown();

      // Totals
      doc.text(`Subtotal: $${params.totals.subtotal.toFixed(2)}`, { align: "right" });
      doc.text(`IVA: $${params.totals.vatAmount.toFixed(2)}`, { align: "right" });
      doc.fontSize(12).text(`TOTAL: $${params.totals.total.toFixed(2)}`, { align: "right" });
      doc.fontSize(10);
      doc.moveDown();

      // QR Code (if available)
      if (params.invoice.qrUrl) {
        doc.text(`Verificar en: ${params.invoice.qrUrl}`, { align: "center", link: params.invoice.qrUrl });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
