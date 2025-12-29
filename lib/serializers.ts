import { PaymentMethod } from "@/app/generated/prisma";

export type ClientData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  taxId: string | null;
  notes: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressApartment: string | null;
  addressCity: string | null;
  discountPercentage: number;
  preferredPaymentMethod: PaymentMethod | null;
  hasCurrentAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeClient(client: {
  id: string;
  branchId: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  taxId: string | null;
  notes: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressApartment: string | null;
  addressCity: string | null;
  discountPercentage: unknown;
  preferredPaymentMethod: PaymentMethod | null;
  hasCurrentAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ClientData {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    birthDate: client.birthDate,
    taxId: client.taxId,
    notes: client.notes,
    addressStreet: client.addressStreet,
    addressNumber: client.addressNumber,
    addressApartment: client.addressApartment,
    addressCity: client.addressCity,
    discountPercentage: Number(client.discountPercentage || 0),
    preferredPaymentMethod: client.preferredPaymentMethod,
    hasCurrentAccount: client.hasCurrentAccount,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}
