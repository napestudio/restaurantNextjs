import { getInvoices } from "@/actions/Invoice";
import { InvoicesClient } from "./invoices-client";
import { UserRole, InvoiceStatus } from "@/app/generated/prisma";
import { requireRole } from "@/lib/permissions/middleware";
import { getCurrentUserBranchId } from "@/lib/user-branch";

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
  invoiceType?: string;
  dateFrom?: string;
  dateTo?: string;
}>;

type Invoice = {
  id: string;
  customerName: string;
  customerDocType: number;
  customerDocNumber: string;
  invoiceType: number;
  ptoVta: number;
  invoiceNumber: number;
  invoiceDate: Date;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  cae: string | null;
  caeFchVto: string | null;
  status: InvoiceStatus;
  qrUrl: string | null;
  createdAt: Date;
  order: {
    id: string;
    publicCode: string;
  } | null;
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(UserRole.MANAGER);

  const params = await searchParams;
  const branchId = (await getCurrentUserBranchId()) || "";

  // Parse search params
  const page = params.page ? Math.max(1, parseInt(params.page) || 1) : 1;
  const pageSize = 20;

  // Validate status parameter
  const validStatuses = Object.values(InvoiceStatus);
  const statusParam =
    params.status && validStatuses.includes(params.status as InvoiceStatus)
      ? (params.status as InvoiceStatus)
      : undefined;

  // Fetch invoices
  const invoicesResult = await getInvoices({
    branchId,
    page,
    pageSize,
    search: params.search,
    status: statusParam,
    invoiceType: params.invoiceType ? parseInt(params.invoiceType) : undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
  });

  // Data is already serialized by the server action
  const invoices: Invoice[] =
    invoicesResult.success && invoicesResult.data
      ? (invoicesResult.data.invoices as Invoice[])
      : [];

  const pagination = (invoicesResult.success &&
    invoicesResult.data?.pagination) || {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <InvoicesClient
          branchId={branchId}
          initialInvoices={invoices}
          initialPagination={pagination}
          initialFilters={{
            search: params.search || "",
            status: params.status,
            invoiceType: params.invoiceType,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          }}
        />
      </main>
    </div>
  );
}
