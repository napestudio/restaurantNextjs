"use server";

import { transporter } from "./email";
import { generateReservationNotificationEmail } from "./email-templates/reservation-notification";

interface SendReservationEmailParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: Date;
  time: string;
  guests: number;
  branchName: string;
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
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.warn("Email configuration missing. Skipping email notification.");
      return {
        success: false,
        error: "Email configuration not set up",
      };
    }

    // Generate the email HTML
    const emailHtml = generateReservationNotificationEmail({
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      date: params.date.toISOString(),
      time: params.time,
      guests: params.guests,
      // branchName: params.branchName,
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

    // Format the date for the subject
    const formattedDate = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(params.date);

    // Send the email
    const info = await transporter.sendMail({
      from: `"${params.branchName}" <${process.env.EMAIL_USER}>`,
      to: "renzo.costarelli@gmail.com",
      subject: `🍽️ Nueva Reserva - ${params.customerName} (${formattedDate})`,
      html: emailHtml,
    });

    // console.log("Reservation notification email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending reservation notification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
