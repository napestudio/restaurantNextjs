"use server";

import { transporter } from "./email";
import { generateReservationNotificationEmail } from "./email-templates/reservation-notification";
import { generateReservationConfirmationEmail } from "./email-templates/reservation-confirmation";

interface SendReservationEmailParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: Date;
  time: string;
  guests: number;
  branchName: string;
  notificationEmail?: string | null;
  timeSlotName?: string;
  exactTime?: Date;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  notes?: string;
  status: string;
  autoAssigned: boolean;
  assignedTables?: string[];
  pricePerPerson?: number;
}

export async function sendReservationNotificationEmail(
  params: SendReservationEmailParams
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn("Email configuration missing. Skipping email notifications.");
    return { success: false, error: "Email configuration not set up" };
  }

  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(params.date);

  const results: { restaurant?: any; customer?: any } = {};

  // --- Restaurant notification ---
  if (params.notificationEmail) {
    try {
      const html = generateReservationNotificationEmail({
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        date: params.date.toISOString(),
        time: params.time,
        guests: params.guests,
        timeSlotName: params.timeSlotName,
        exactTime: params.exactTime?.toISOString(),
        dietaryRestrictions: params.dietaryRestrictions,
        accessibilityNeeds: params.accessibilityNeeds,
        notes: params.notes,
        status: params.status,
        autoAssigned: params.autoAssigned,
        assignedTables: params.assignedTables,
        pricePerPerson: params.pricePerPerson,
      });

      const info = await transporter.sendMail({
        from: `"${params.branchName}" <${process.env.EMAIL_USER}>`,
        to: params.notificationEmail,
        subject: `🍽️ Nueva Reserva - ${params.customerName} (${formattedDate})`,
        html,
      });

      results.restaurant = { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending restaurant notification email:", error);
      results.restaurant = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    console.warn("Branch notification email not configured. Skipping restaurant notification.");
    results.restaurant = { success: false, error: "Branch notification email not configured" };
  }

  // --- Customer confirmation ---
  try {
    const html = generateReservationConfirmationEmail({
      customerName: params.customerName,
      date: params.date.toISOString(),
      time: params.time,
      guests: params.guests,
      branchName: params.branchName,
      timeSlotName: params.timeSlotName,
      exactTime: params.exactTime?.toISOString(),
      dietaryRestrictions: params.dietaryRestrictions,
      accessibilityNeeds: params.accessibilityNeeds,
      notes: params.notes,
      status: params.status,
      pricePerPerson: params.pricePerPerson,
    });

    const info = await transporter.sendMail({
      from: `"${params.branchName}" <${process.env.EMAIL_USER}>`,
      to: params.customerEmail,
      subject: `✅ Reserva recibida en ${params.branchName} (${formattedDate})`,
      html,
    });

    results.customer = { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending customer confirmation email:", error);
    results.customer = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return results;
}
