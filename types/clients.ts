import type { PaymentMethod } from "@/app/generated/prisma";

export type ClientInput = {
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  taxId?: string;
  notes?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressApartment?: string;
  addressCity?: string;
  discountPercentage?: number;
  preferredPaymentMethod?: PaymentMethod;
  hasCurrentAccount?: boolean;
};
