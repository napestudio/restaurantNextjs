"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  testArcaConnection,
  emitTestInvoice,
  getLastInvoiceNumber,
  getSalesPoints,
  getInvoiceTypes,
} from "@/actions/Arca";
import {
  INVOICE_TYPES,
  DOCUMENT_TYPES,
  CONCEPTS,
  formatArcaDate,
  getInvoiceType,
  getDocumentType,
  type ArcaCreateVoucherResponse,
} from "@/lib/types/arca";
import {
  generateAfipQrData,
  generateAfipQrUrl,
  isValidCae,
} from "@/lib/arca-qr";
import { useGgEzPrint } from "@/contexts/gg-ez-print-context";
import { prepareAfipInvoicePrint } from "@/actions/PrinterActions";
import type { PrinterStatus, PrinterConnectionType } from "@/app/generated/prisma";

// Types for state
type AfipError = {
  Code: number;
  Msg: string;
};

type AfipObservation = {
  Code: number;
  Msg: string;
};

type InvoiceResponse =
  | (ArcaCreateVoucherResponse & {
      Errors?: AfipError[];
      Observations?: AfipObservation[];
    })
  | {
      error: string;
    };

type QrInvoiceData = {
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  fecha: string;
  importe: number;
  moneda: string;
  tipoDocRec: number;
  nroDocRec: number;
};

// Printer type for selection
type PrinterForSelection = {
  id: string;
  name: string;
  systemName: string; // IP or Windows printer name
  connectionType: PrinterConnectionType;
  status: PrinterStatus;
  isActive: boolean;
  charactersPerLine: number;
};

interface TestArcaClientProps {
  printers: PrinterForSelection[];
}

export function TestArcaClient({ printers }: TestArcaClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [response, setResponse] = useState<InvoiceResponse | null>(null);

  // QR code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrInvoiceData, setQrInvoiceData] = useState<QrInvoiceData | null>(
    null,
  );

  // Print state
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  // Printer selection state
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterForSelection | null>(null);

  // gg-ez-print context
  const { print: sendPrintJob, isConnected: printerConnected } = useGgEzPrint();

  // Restore last selected printer from localStorage
  useEffect(() => {
    const savedPrinterId = localStorage.getItem('testArca_lastPrinterId');
    if (savedPrinterId && printers.find(p => p.id === savedPrinterId)) {
      setSelectedPrinterId(savedPrinterId);
      setSelectedPrinter(printers.find(p => p.id === savedPrinterId) || null);
    } else if (printers.length === 1) {
      // Auto-select if only one printer
      setSelectedPrinterId(printers[0].id);
      setSelectedPrinter(printers[0]);
    }
  }, [printers]);

  // Form state with default values for testing
  const [formData, setFormData] = useState({
    CbteTipo: 6, // Factura B (most common for restaurants)
    PtoVta: 1, // Sales point 1
    DocTipo: 99, // Consumidor Final
    DocNro: 0, // No document for Consumidor Final
    Concepto: 1, // Products
    MonId: "PES", // Pesos
  });

  // Line items for the invoice
  type LineItem = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number; // 0, 10.5, 21, 27
  };

  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      description: "Milanesa con papas fritas",
      quantity: 2,
      unitPrice: 2500,
      vatRate: 21,
    },
    {
      id: "2",
      description: "Coca Cola 500ml",
      quantity: 3,
      unitPrice: 800,
      vatRate: 21,
    },
    {
      id: "3",
      description: "Flan casero",
      quantity: 1,
      unitPrice: 1200,
      vatRate: 21,
    },
  ]);

  // ==========================================================================
  // Calculation Helper Functions
  // ==========================================================================

  // Calculate totals from line items
  const calculateTotalsFromItems = () => {
    let totalNet = 0;
    const vatBreakdown: { [key: number]: { base: number; amount: number } } =
      {};

    items.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemNet = itemTotal / (1 + item.vatRate / 100);
      const itemVat = itemTotal - itemNet;

      totalNet += itemNet;

      if (!vatBreakdown[item.vatRate]) {
        vatBreakdown[item.vatRate] = { base: 0, amount: 0 };
      }
      vatBreakdown[item.vatRate].base += itemNet;
      vatBreakdown[item.vatRate].amount += itemVat;
    });

    const totalVat = Object.values(vatBreakdown).reduce(
      (sum, vat) => sum + vat.amount,
      0,
    );
    const total = totalNet + totalVat;

    return {
      total: Math.round(total * 100) / 100,
      net: Math.round(totalNet * 100) / 100,
      vat: Math.round(totalVat * 100) / 100,
      breakdown: vatBreakdown,
    };
  };

  // Get VAT rate ID for AFIP
  const getVatRateId = (rate: number): number => {
    const rateMap: { [key: number]: number } = {
      0: 3, // 0%
      10.5: 4, // 10.5%
      21: 5, // 21%
      27: 6, // 27%
    };
    return rateMap[rate] || 5; // Default to 21%
  };

  // ==========================================================================
  // Line Item Management Functions
  // ==========================================================================

  const addItem = () => {
    const newId = (
      Math.max(...items.map((i) => parseInt(i.id))) + 1
    ).toString();
    setItems([
      ...items,
      {
        id: newId,
        description: "",
        quantity: 1,
        unitPrice: 0,
        vatRate: 21,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  // ==========================================================================
  // QR Code Generation
  // ==========================================================================

  // Generate QR code when CAE is received
  useEffect(() => {
    if (response && !("error" in response) && response.cae && qrInvoiceData) {
      generateQrCode();
    } else {
      setQrCodeDataUrl(null);
    }
  }, [response, qrInvoiceData]);

  const generateQrCode = async () => {
    if (!response || !qrInvoiceData || "error" in response) {
      return;
    }

    try {
      // Validate CAE format
      if (!isValidCae(response.cae)) {
        console.error("Invalid CAE format:", response.cae);
        return;
      }

      // Generate QR data
      const qrData = generateAfipQrData({
        ...qrInvoiceData,
        cae: response.cae,
      });

      // Generate AFIP URL
      const afipUrl = generateAfipQrUrl(qrData);

      console.log("[QR] Generated AFIP QR data:", qrData);
      console.log("[QR] AFIP URL:", afipUrl);

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(afipUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeDataUrl(qrImage);
      console.log("[QR] QR code generated successfully");
    } catch (error) {
      console.error("[QR] Error generating AFIP QR code:", error);
      setQrCodeDataUrl(null);
    }
  };

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleTestConnection = async () => {
    setIsLoading(true);
    setResponse(null);

    const result = await testArcaConnection();

    if (result.success) {
      setConnectionStatus("✅ Conectado a ARCA/AFIP");
    } else {
      setConnectionStatus("❌ Error de conexión");
    }

    setIsLoading(false);
  };

  const handleGetLastInvoice = async () => {
    setIsLoading(true);

    const result = await getLastInvoiceNumber(
      formData.PtoVta,
      formData.CbteTipo,
    );

    if (result.success) {
      console.log("Last invoice number:", result.data);
      setConnectionStatus(
        `✅ Último número de factura: ${result.data.cbteNro || 0}`,
      );
    } else {
      setConnectionStatus(`❌ Error: ${result.error}`);
    }

    setIsLoading(false);
  };

  const handleGetSalesPoints = async () => {
    setIsLoading(true);

    const result = await getSalesPoints();

    if (result.success) {
      console.log("Sales points:", result.data);
      setConnectionStatus(
        `✅ Puntos de venta obtenidos: ${JSON.stringify(result.data)}`,
      );
    } else {
      setConnectionStatus(`❌ Error: ${result.error}`);
    }

    setIsLoading(false);
  };

  const handleGetInvoiceTypes = async () => {
    setIsLoading(true);

    const result = await getInvoiceTypes();

    if (result.success) {
      console.log("Invoice types:", result.data);
      setConnectionStatus(
        `✅ Tipos de factura obtenidos: ${JSON.stringify(result.data)}`,
      );
    } else {
      setConnectionStatus(`❌ Error: ${result.error}`);
    }

    setIsLoading(false);
  };

  const handleEmitInvoice = async () => {
    setIsLoading(true);
    setResponse(null);

    // Calculate totals from items
    const totals = calculateTotalsFromItems();

    // Get last invoice number first
    const lastInvoice = await getLastInvoiceNumber(
      formData.PtoVta,
      formData.CbteTipo,
    );
    const nextNumber = lastInvoice.success
      ? (lastInvoice.data.cbteNro || 0) + 1
      : 1;

    // Get current date in AFIP format (YYYYMMDD as string)
    const currentDate = formatArcaDate(new Date());

    // Build VAT breakdown array from items
    const ivaArray = Object.entries(totals.breakdown).map(([rate, data]) => ({
      Id: getVatRateId(Number(rate)),
      BaseImp: Math.round(data.base * 100) / 100,
      Importe: Math.round(data.amount * 100) / 100,
    }));

    // Build invoice data - NOTE: WSFEV1 only supports aggregated totals
    const invoiceData = {
      CantReg: 1,
      CbteTipo: formData.CbteTipo,
      PtoVta: formData.PtoVta,
      DocTipo: formData.DocTipo,
      DocNro: formData.DocNro,
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: currentDate,
      Concepto: formData.Concepto,
      // Totals calculated from items
      ImpTotal: totals.total,
      ImpNeto: totals.net,
      ImpIVA: totals.vat,
      ImpTotConc: 0, // Required: Not taxed amount
      ImpOpEx: 0, // Required: Exempt amount
      ImpTrib: 0, // Required: Other taxes
      // Currency
      MonId: formData.MonId,
      MonCotiz: 1,
      // IVA Receptor condition (5 = Consumidor Final)
      CondicionIVAReceptorId: 5,
      // VAT breakdown by rate
      Iva: ivaArray,
    };

    console.log("Emitting invoice with data:", invoiceData);
    console.log("Line items (NOT sent to AFIP - SDK limitation):", items);

    const result = await emitTestInvoice(invoiceData);
    setResponse(result.success ? result.data : { error: result.error });

    // Store invoice data for QR generation
    if (result.success && result.data.cae) {
      setQrInvoiceData({
        cuit: result.data.cuit || 0, // From server response
        ptoVta: formData.PtoVta,
        tipoCmp: formData.CbteTipo,
        nroCmp: nextNumber,
        fecha: currentDate,
        importe: totals.total,
        moneda: formData.MonId,
        tipoDocRec: formData.DocTipo,
        nroDocRec: formData.DocNro,
      });
    }

    setIsLoading(false);
  };

  // ==========================================================================
  // Print Handler
  // ==========================================================================

  /**
   * Handle printing the invoice to thermal printer
   */
  const handlePrintInvoice = async () => {
    if (
      !response ||
      "error" in response ||
      !response.cae ||
      !qrInvoiceData ||
      items.length === 0
    ) {
      setPrintError("No hay factura para imprimir. Emita una factura primero.");
      return;
    }

    // Validate printer is selected
    if (!selectedPrinter) {
      setPrintError("Debe seleccionar una impresora");
      return;
    }

    setIsPrinting(true);
    setPrintError(null);

    try {
      // Format invoice type name
      const invoiceTypeObj = getInvoiceType(qrInvoiceData.tipoCmp);
      const invoiceTypeName =
        invoiceTypeObj?.name || `Tipo ${qrInvoiceData.tipoCmp}`;

      // Format invoice number (PtoVta-Number)
      const invoiceNumber = `${String(qrInvoiceData.ptoVta).padStart(5, "0")}-${String(
        qrInvoiceData.nroCmp,
      ).padStart(8, "0")}`;

      // Format invoice date (YYYYMMDD -> DD/MM/YYYY)
      const dateStr = qrInvoiceData.fecha;
      const formattedDate = `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;

      // Format CUIT (XX-XXXXXXXX-X)
      const cuitStr = String(qrInvoiceData.cuit);
      const formattedCuit = `${cuitStr.substring(0, 2)}-${cuitStr.substring(2, 10)}-${cuitStr.substring(10)}`;

      // Format customer document
      const docTypeObj = getDocumentType(qrInvoiceData.tipoDocRec);
      const customerDoc =
        qrInvoiceData.nroDocRec === 0
          ? "Consumidor Final"
          : `${docTypeObj?.name || "Doc"}: ${qrInvoiceData.nroDocRec}`;

      // Format CAE expiration (YYYYMMDD -> DD/MM/YYYY)
      const caeExp = response.caeFchVto;
      const formattedCaeExp = `${caeExp.substring(6, 8)}/${caeExp.substring(4, 6)}/${caeExp.substring(0, 4)}`;

      // Get calculated totals
      const totals = calculateTotalsFromItems();

      // Prepare line items
      const printItems = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        total: item.quantity * item.unitPrice * (1 + item.vatRate / 100),
      }));

      // Prepare VAT breakdown
      const vatBreakdown = Object.entries(totals.breakdown).map(
        ([rate, data]: [string, { base: number; amount: number }]) => ({
          rate: Number(rate),
          base: data.base,
          amount: data.amount,
        }),
      );

      // Generate AFIP QR URL
      const qrData = generateAfipQrData({
        ...qrInvoiceData,
        cae: response.cae,
      });

      console.log("[Print] Preparing print job...");

      // Prepare print job via Server Action
      const result = await prepareAfipInvoicePrint({
        invoiceType: invoiceTypeName,
        invoiceNumber,
        invoiceDate: formattedDate,
        businessName: "PRUEBA - TEST",
        cuit: formattedCuit,
        customerDoc,
        items: printItems,
        subtotal: totals.net,
        vatBreakdown,
        totalVat: totals.vat,
        total: totals.total,
        cae: response.cae,
        caeExpiration: formattedCaeExp,
        printerIp: selectedPrinter?.systemName || "192.168.100.20",
        charactersPerLine: selectedPrinter?.charactersPerLine || 48,
      });

      if (!result.success) {
        setPrintError(result.error || "Error al preparar la impresión");
        setIsPrinting(false);
        return;
      }

      if (!result.jobs || result.jobs.length === 0) {
        setPrintError("No se generó ningún trabajo de impresión");
        setIsPrinting(false);
        return;
      }

      console.log("[Print] Sending to gg-ez-print...");

      // Send to gg-ez-print
      const job = result.jobs[0];
      const printRequest = {
        printer_name: job.target.systemName,
        type: (job.target.type === "usb" ? "USB" : "Network") as
          | "USB"
          | "Network",
        content: job.escPosData,
        font_size: 1,
        paper_width: 80,
      };

      await sendPrintJob(printRequest);
      console.log("[Print] Factura enviada a impresora exitosamente");
    } catch (error) {
      console.error("[Print] Error:", error);
      setPrintError(
        error instanceof Error
          ? error.message
          : "Error desconocido al imprimir",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Prueba de Integración ARCA/AFIP
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Test de emisión de facturas electrónicas para el sistema de
            facturación del restaurante
          </p>
        </div>

        {/* Connection Test Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-blue-700 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            Verificar Conexión
          </h2>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? "Conectando..." : "Probar Conexión"}
              </button>

              <button
                onClick={handleGetSalesPoints}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Obtener Puntos de Venta
              </button>

              <button
                onClick={handleGetInvoiceTypes}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Obtener Tipos de Comprobantes
              </button>
            </div>

            {connectionStatus && (
              <div className="text-sm font-medium">{connectionStatus}</div>
            )}
          </div>
        </section>

        {/* Printer Selection Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-blue-700 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </span>
            Selección de Impresora
          </h2>

          {printers.length === 0 ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded border border-amber-200">
              <p className="font-semibold mb-2">⚠️ No hay impresoras configuradas</p>
              <p>
                Configure una impresora en{" "}
                <a
                  href="/dashboard/config/printers"
                  className="underline font-medium hover:text-amber-700"
                >
                  Configuración de Impresoras
                </a>{" "}
                para poder imprimir facturas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="printer-select" className="block text-sm font-medium text-gray-700">
                  Impresora
                </label>
                <select
                  id="printer-select"
                  value={selectedPrinterId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPrinterId(id);
                    setSelectedPrinter(printers.find(p => p.id === id) || null);
                    if (id) {
                      localStorage.setItem('testArca_lastPrinterId', id);
                    }
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Seleccione una impresora...</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} ({printer.connectionType === 'NETWORK' ? printer.systemName : 'USB'})
                      {printer.status === 'ONLINE' ? ' ✓' : printer.status === 'ERROR' ? ' ⚠' : ' ○'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPrinter && (
                <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{selectedPrinter.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">{selectedPrinter.connectionType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dirección:</span>
                    <span className="font-mono text-xs">{selectedPrinter.systemName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      selectedPrinter.status === 'ONLINE'
                        ? 'bg-green-100 text-green-800'
                        : selectedPrinter.status === 'ERROR'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedPrinter.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Caracteres por línea:</span>
                    <span className="font-medium">{selectedPrinter.charactersPerLine}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Invoice Configuration Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-green-700 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
              3
            </span>
            Configurar Factura de Prueba
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Comprobante
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.CbteTipo}
                onChange={(e) =>
                  setFormData({ ...formData, CbteTipo: Number(e.target.value) })
                }
              >
                {INVOICE_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Sales Point */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punto de Venta
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.PtoVta}
                onChange={(e) =>
                  setFormData({ ...formData, PtoVta: Number(e.target.value) })
                }
                min="1"
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.DocTipo}
                onChange={(e) =>
                  setFormData({ ...formData, DocTipo: Number(e.target.value) })
                }
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Documento
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.DocNro}
                onChange={(e) =>
                  setFormData({ ...formData, DocNro: Number(e.target.value) })
                }
                placeholder="0 para Consumidor Final"
                min="0"
              />
            </div>

            {/* Concept */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.Concepto}
                onChange={(e) =>
                  setFormData({ ...formData, Concepto: Number(e.target.value) })
                }
              >
                {CONCEPTS.map((concept) => (
                  <option key={concept.code} value={concept.code}>
                    {concept.name} - {concept.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                value={formData.MonId}
                readOnly
              />
            </div>

            {/* Line Items Section */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Items de la Factura
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  + Agregar Item
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded"
                  >
                    {/* Description */}
                    <div className="col-span-5">
                      <input
                        type="text"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded"
                        placeholder="Descripción"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded"
                        placeholder="Cant."
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number(e.target.value),
                          )
                        }
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded"
                        placeholder="P. Unit."
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "unitPrice",
                            Number(e.target.value),
                          )
                        }
                      />
                    </div>

                    {/* VAT Rate */}
                    <div className="col-span-2">
                      <select
                        className="w-full p-1.5 text-sm border border-gray-300 rounded"
                        value={item.vatRate}
                        onChange={(e) =>
                          updateItem(item.id, "vatRate", Number(e.target.value))
                        }
                      >
                        <option value={0}>0%</option>
                        <option value={10.5}>10.5%</option>
                        <option value={21}>21%</option>
                        <option value={27}>27%</option>
                      </select>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className={`text-red-500 hover:text-red-700 ${
                          items.length === 1
                            ? "opacity-30 cursor-not-allowed"
                            : ""
                        }`}
                        title="Eliminar item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Subtotal display */}
                    <div className="col-span-12 text-right text-xs text-gray-600">
                      Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                ⚠️ Nota: Los items se usan solo para calcular totales. AFIP
                WSFEV1 no soporta envío de detalles itemizados (requiere
                WSMTXCA).
              </p>
            </div>

            {/* Calculated Totals - Read Only */}
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Totales Calculados
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Neto Gravado
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    ${calculateTotalsFromItems().net.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    IVA Total
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    ${calculateTotalsFromItems().vat.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Total Factura
                  </label>
                  <div className="text-lg font-bold text-green-600">
                    ${calculateTotalsFromItems().total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* VAT Breakdown */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Detalle IVA por Alícuota:
                </p>
                <div className="space-y-1">
                  {Object.entries(calculateTotalsFromItems().breakdown).map(
                    ([rate, data]) => (
                      <div
                        key={rate}
                        className="text-xs text-gray-700 flex justify-between"
                      >
                        <span>IVA {rate}%:</span>
                        <span>
                          Base ${data.base.toFixed(2)} → IVA $
                          {data.amount.toFixed(2)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleGetLastInvoice}
              disabled={isLoading}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Obtener Último Número
            </button>
            <button
              onClick={handleEmitInvoice}
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Emitiendo..." : "✓ Emitir Factura de Prueba"}
            </button>
          </div>
        </section>

        {/* Response Display Section */}
        {response && (
          <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-purple-700">
              Respuesta de ARCA
            </h2>

            {/* JSON Response */}
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs sm:text-sm font-mono max-h-96">
              {JSON.stringify(response, null, 2)}
            </pre>

            {/* Success Message */}
            {!("error" in response) && response.cae && (
              <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="font-bold text-green-800 text-lg flex items-center gap-2">
                  ✅ Factura Autorizada Exitosamente
                </p>
                <div className="mt-3 space-y-2 text-sm text-green-900">
                  <p>
                    <strong>CAE (Código de Autorización):</strong>{" "}
                    <span className="font-mono bg-green-100 px-2 py-1 rounded">
                      {response.cae}
                    </span>
                  </p>
                  <p>
                    <strong>Vencimiento CAE:</strong>{" "}
                    <span className="font-mono">{response.caeFchVto}</span>
                  </p>
                </div>

                {/* QR Code Display */}
                {qrCodeDataUrl && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm font-medium text-green-800 mb-2">
                      Código QR AFIP (RG 4892/2020):
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white p-3 rounded border border-green-300 shadow-sm">
                        <img
                          src={qrCodeDataUrl}
                          alt="AFIP QR Code"
                          className="w-40 h-40"
                        />
                      </div>
                      <p className="text-xs text-green-700 text-center max-w-xs">
                        Escanear para verificar la autenticidad de la factura en
                        el sitio de AFIP
                      </p>

                      {/* Print Button */}
                      <div className="mt-3 w-full">
                        <button
                          onClick={handlePrintInvoice}
                          disabled={isPrinting || !printerConnected || !selectedPrinter}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isPrinting ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              Imprimiendo...
                            </>
                          ) : !selectedPrinter ? (
                            <>🖨️ Seleccione una impresora</>
                          ) : !printerConnected ? (
                            <>🖨️ gg-ez-print desconectado</>
                          ) : (
                            <>🖨️ Imprimir en {selectedPrinter.name}</>
                          )}
                        </button>

                        {!printerConnected && (
                          <p className="text-xs text-amber-600 mt-2 text-center">
                            ⚠️ gg-ez-print no conectado. Inicie el servicio
                            primero.
                          </p>
                        )}

                        {printError && (
                          <p className="text-xs text-red-600 mt-2 text-center">
                            ❌ {printError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {"error" in response && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="font-bold text-red-800 text-lg flex items-center gap-2">
                  ❌ Error en la Operación
                </p>
                <p className="mt-2 text-sm text-red-900">{response.error}</p>
              </div>
            )}

            {/* AFIP Errors */}
            {!("error" in response) &&
              response.Errors &&
              response.Errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="font-bold text-red-800 mb-2">
                    Errores de AFIP:
                  </p>
                  <ul className="space-y-1 text-sm text-red-900">
                    {response.Errors.map((error, index) => (
                      <li key={index}>
                        • [{error.Code}] {error.Msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* AFIP Observations */}
            {!("error" in response) &&
              response.Observations &&
              response.Observations.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="font-bold text-yellow-800 mb-2">
                    Observaciones:
                  </p>
                  <ul className="space-y-1 text-sm text-yellow-900">
                    {response.Observations.map((obs, index) => (
                      <li key={index}>
                        • [{obs.Code}] {obs.Msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </section>
        )}

        {/* Documentation Section */}
        <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold mb-3 text-blue-900 flex items-center gap-2">
            📚 Documentación y Notas
          </h2>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Ambiente actual:</strong> Test (Homologación de AFIP)
            </p>
            <p>
              <strong>Importante:</strong> Los CAE generados en el ambiente de
              prueba NO son válidos para uso fiscal.
            </p>
            <ul className="mt-3 space-y-1 ml-4 list-disc">
              <li>
                Factura B (código 6): Para consumidores finales y
                monotributistas
              </li>
              <li>Tipo Doc 99 + Doc Nro 0: Consumidor final sin identificar</li>
              <li>El CAE tiene validez de 10 días hábiles desde su emisión</li>
              <li>Punto de venta debe estar habilitado previamente en AFIP</li>
              <li>
                <strong>⚠️ Limitación del SDK:</strong> El SDK de Arca usa el
                servicio WSFEV1 de AFIP que solo envía totales agregados. Los
                items se usan para calcular los totales, pero no se envían al
                servidor de AFIP. Para facturación con detalle itemizado se
                requiere WSMTXCA (no soportado actualmente).
              </li>
              <li>
                <strong>Código QR AFIP:</strong> Se genera automáticamente tras
                la emisión exitosa. Permite verificar la factura en el sitio de
                AFIP (obligatorio según RG 4892/2020).
              </li>
              <li>
                Para producción, actualizar variables de entorno con
                credenciales reales
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
