"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PaymentMethod } from "@/app/generated/prisma";
import { serializeClient, type ClientData } from "@/lib/serializers";

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

export type { ClientData };

export async function getClients(branchId: string): Promise<{
  success: boolean;
  data?: ClientData[];
  error?: string;
}> {
  try {
    const clients = await prisma.client.findMany({
      where: { branchId },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: clients.map(serializeClient),
    };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return {
      success: false,
      error: "Error al obtener clientes",
    };
  }
}

export async function searchClients(
  branchId: string,
  query: string
): Promise<{
  success: boolean;
  data?: ClientData[];
  error?: string;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return { success: true, data: [] };
    }

    const clients = await prisma.client.findMany({
      where: {
        branchId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    return {
      success: true,
      data: clients.map(serializeClient),
    };
  } catch (error) {
    console.error("Error searching clients:", error);
    return {
      success: false,
      error: "Error al buscar clientes",
    };
  }
}

export async function createClient(
  branchId: string,
  data: ClientInput
): Promise<{
  success: boolean;
  data?: ClientData;
  error?: string;
}> {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return {
        success: false,
        error: "El nombre es requerido",
      };
    }

    const client = await prisma.client.create({
      data: {
        branchId,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        taxId: data.taxId?.trim() || null,
        notes: data.notes?.trim() || null,
        addressStreet: data.addressStreet?.trim() || null,
        addressNumber: data.addressNumber?.trim() || null,
        addressApartment: data.addressApartment?.trim() || null,
        addressCity: data.addressCity?.trim() || null,
        discountPercentage: data.discountPercentage || 0,
        preferredPaymentMethod: data.preferredPaymentMethod || null,
        hasCurrentAccount: data.hasCurrentAccount || false,
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: serializeClient(client),
    };
  } catch (error) {
    console.error("Error creating client:", error);
    return {
      success: false,
      error: "Error al crear cliente",
    };
  }
}

export async function updateClient(
  clientId: string,
  data: ClientInput
): Promise<{
  success: boolean;
  data?: ClientData;
  error?: string;
}> {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return {
        success: false,
        error: "El nombre es requerido",
      };
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        taxId: data.taxId?.trim() || null,
        notes: data.notes?.trim() || null,
        addressStreet: data.addressStreet?.trim() || null,
        addressNumber: data.addressNumber?.trim() || null,
        addressApartment: data.addressApartment?.trim() || null,
        addressCity: data.addressCity?.trim() || null,
        discountPercentage: data.discountPercentage || 0,
        preferredPaymentMethod: data.preferredPaymentMethod || null,
        hasCurrentAccount: data.hasCurrentAccount || false,
      },
    });

    revalidatePath("/dashboard/tables");

    return {
      success: true,
      data: serializeClient(client),
    };
  } catch (error) {
    console.error("Error updating client:", error);
    return {
      success: false,
      error: "Error al actualizar cliente",
    };
  }
}

export async function deleteClient(clientId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if client has orders
    const ordersCount = await prisma.order.count({
      where: { clientId },
    });

    if (ordersCount > 0) {
      return {
        success: false,
        error: "No se puede eliminar un cliente con pedidos asociados",
      };
    }

    await prisma.client.delete({
      where: { id: clientId },
    });

    revalidatePath("/dashboard/tables");

    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return {
      success: false,
      error: "Error al eliminar cliente",
    };
  }
}

export async function getClientById(clientId: string): Promise<{
  success: boolean;
  data?: ClientData;
  error?: string;
}> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return {
        success: false,
        error: "Cliente no encontrado",
      };
    }

    return {
      success: true,
      data: serializeClient(client),
    };
  } catch (error) {
    console.error("Error fetching client:", error);
    return {
      success: false,
      error: "Error al obtener cliente",
    };
  }
}
