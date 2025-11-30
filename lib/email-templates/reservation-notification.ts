interface ReservationEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  time: string;
  guests: number;
  // branchName: string;
  timeSlotName?: string;
  exactTime?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  notes?: string;
  status: string;
  autoAssigned: boolean;
  assignedTables?: string[];
  pricePerPerson?: number;
}

export function generateReservationNotificationEmail(
  data: ReservationEmailData
): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return data.time;
    const time = new Date(timeString);
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(time);
  };

  const statusBadgeColor = data.status === "CONFIRMED" ? "#10b981" : "#f59e0b";
  const statusText = data.status === "CONFIRMED" ? "Confirmada" : "Pendiente";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">

    <tr>
      <td style="padding: 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; padding: 8px 16px; background-color: ${statusBadgeColor}; color: #ffffff; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  ${statusText}${data.autoAssigned ? " • Mesas Asignadas" : ""}
                </span>
              </div>

              <!-- Reservation Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600; border-bottom: 2px solid #dc2626; padding-bottom: 12px;">
                  📅 Detalles de la Reserva
                </h2>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Fecha</strong>
                      <span style="color: #1f2937; font-size: 16px;">${formatDate(
                        data.date
                      )}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Hora</strong>
                      <span style="color: #1f2937; font-size: 16px;">${formatTime(
                        data.exactTime
                      )}</span>
                      ${
                        data.timeSlotName
                          ? `<span style="color: #6b7280; font-size: 14px; margin-left: 8px;">(${data.timeSlotName})</span>`
                          : ""
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Número de Personas</strong>
                      <span style="color: #1f2937; font-size: 16px;">👥 ${
                        data.guests
                      } ${data.guests === 1 ? "persona" : "personas"}</span>
                    </td>
                  </tr>
                  ${
                    data.assignedTables && data.assignedTables.length > 0
                      ? `
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Mesas Asignadas</strong>
                      <span style="color: #1f2937; font-size: 16px;">${data.assignedTables.join(
                        ", "
                      )}</span>
                    </td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Customer Information -->
              <div style="background-color: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #dc2626;">
                <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600;">
                  👤 Datos del Cliente
                </h2>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Nombre</strong>
                      <span style="color: #1f2937; font-size: 16px;">${
                        data.customerName
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Email</strong>
                      <a href="mailto:${
                        data.customerEmail
                      }" style="color: #dc2626; text-decoration: none; font-size: 16px;">${
    data.customerEmail
  }</a>
                    </td>
                  </tr>
                  ${
                    data.customerPhone
                      ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Teléfono</strong>
                      <a href="tel:${data.customerPhone}" style="color: #dc2626; text-decoration: none; font-size: 16px;">${data.customerPhone}</a>
                    </td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Special Requirements (if any) -->
              ${
                data.dietaryRestrictions ||
                data.accessibilityNeeds ||
                data.notes
                  ? `
              <div style="background-color: #fffbeb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600;">
                  ⚠️ Requerimientos Especiales
                </h2>

                ${
                  data.dietaryRestrictions
                    ? `
                <div style="margin-bottom: 16px;">
                  <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Restricciones Alimentarias</strong>
                  <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.5;">${data.dietaryRestrictions}</p>
                </div>
                `
                    : ""
                }

                ${
                  data.accessibilityNeeds
                    ? `
                <div style="margin-bottom: 16px;">
                  <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Necesidades de Accesibilidad</strong>
                  <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.5;">${data.accessibilityNeeds}</p>
                </div>
                `
                    : ""
                }

                ${
                  data.notes
                    ? `
                <div>
                  <strong style="color: #374151; display: block; font-size: 14px; margin-bottom: 4px;">Notas Adicionales</strong>
                  <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.5;">${data.notes}</p>
                </div>
                `
                    : ""
                }
              </div>
              `
                  : ""
              }

              <!-- Action Required (if pending) -->
              ${
                !data.autoAssigned
                  ? `
              <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                  ⚠️ Esta reserva requiere asignación manual de mesas
                </p>
              </div>
              `
                  : ""
              }

              <!-- Paid Reservation Notice -->
              ${
                data.pricePerPerson && data.pricePerPerson > 0
                  ? `
              <div style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-top: 16px;">
                <h3 style="margin: 0 0 12px; color: #92400e; font-size: 18px; font-weight: 600;">
                  💳 Reserva con Pago Requerido
                </h3>
                <p style="margin: 0 0 12px; color: #78350f; font-size: 16px; line-height: 1.5;">
                  <strong>IMPORTANTE:</strong> Esta es una reserva de pago. El cliente debe ser contactado para confirmar la reserva y coordinar el pago.
                </p>
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 12px; margin-top: 12px;">
                  <p style="margin: 0; color: #78350f; font-size: 16px;">
                    <strong>Monto total:</strong> $${(data.pricePerPerson * data.guests).toFixed(2)}
                  </p>
                  <p style="margin: 4px 0 0; color: #92400e; font-size: 14px;">
                    (${data.guests} ${data.guests === 1 ? 'persona' : 'personas'} × $${data.pricePerPerson.toFixed(2)})
                  </p>
                </div>
              </div>
              `
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #f9fafb;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
          Este es un correo automático generado por el sistema de reservas
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
