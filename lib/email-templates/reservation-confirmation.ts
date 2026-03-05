import { formatCurrency } from "@/lib/currency";

interface ReservationConfirmationEmailData {
  customerName: string;
  date: string;
  time: string;
  guests: number;
  branchName: string;
  timeSlotName?: string;
  exactTime?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  notes?: string;
  status: string;
  pricePerPerson?: number;
}

export function generateReservationConfirmationEmail(
  data: ReservationConfirmationEmailData,
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

  const isConfirmed = data.status === "CONFIRMED";
  const statusBadgeColor = isConfirmed ? "#10b981" : "#f59e0b";
  const statusText = isConfirmed ? "Confirmada" : "Pendiente de confirmación";
  const headingText = isConfirmed
    ? "¡Tu reserva está confirmada!"
    : "Tu reserva está pendiente de confirmación";
  const subText = isConfirmed
    ? `Tu lugar en <strong>${data.branchName}</strong> está reservado. ¡Te esperamos!`
    : `Recibimos tu solicitud en <strong>${data.branchName}</strong>. Te confirmaremos a la brevedad.`;

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

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 26px; font-weight: 700;">
                ${data.branchName}
              </h1>
              <p style="margin: 0; color: #9ca3af; font-size: 15px;">Sistema de Reservas</p>
            </td>
          </tr>

          <!-- Status banner -->
          <tr>
            <td style="background-color: ${statusBadgeColor}; padding: 16px 24px; text-align: center;">
              <span style="color: #ffffff; font-size: 16px; font-weight: 700;">
                ${statusText}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">

              <!-- Greeting -->
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: 700;">
                Hola, ${data.customerName}
              </h2>
              <p style="margin: 0 0 28px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${subText}
              </p>

              <!-- Reservation Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 20px; color: #111827; font-size: 18px; font-weight: 600; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
                  📅 Detalles de tu reserva
                </h3>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280; display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Fecha</strong>
                      <span style="color: #111827; font-size: 16px;">${formatDate(data.date)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280; display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Hora</strong>
                      <span style="color: #111827; font-size: 16px;">${formatTime(data.exactTime)}</span>
                      ${
                        data.timeSlotName
                          ? `<span style="color: #6b7280; font-size: 14px; margin-left: 8px;">(${data.timeSlotName})</span>`
                          : ""
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <strong style="color: #6b7280; display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Personas</strong>
                      <span style="color: #111827; font-size: 16px;">👥 ${data.guests} ${data.guests === 1 ? "persona" : "personas"}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Special Requirements (if any) -->
              ${
                data.dietaryRestrictions ||
                data.accessibilityNeeds ||
                data.notes
                  ? `
              <div style="background-color: #fffbeb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 16px; color: #92400e; font-size: 16px; font-weight: 600;">
                  Tus requerimientos especiales
                </h3>
                ${
                  data.dietaryRestrictions
                    ? `<div style="margin-bottom: 12px;">
                  <strong style="color: #78350f; font-size: 14px;">Restricciones alimentarias:</strong>
                  <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px;">${data.dietaryRestrictions}</p>
                </div>`
                    : ""
                }
                ${
                  data.accessibilityNeeds
                    ? `<div style="margin-bottom: 12px;">
                  <strong style="color: #78350f; font-size: 14px;">Necesidades de accesibilidad:</strong>
                  <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px;">${data.accessibilityNeeds}</p>
                </div>`
                    : ""
                }
                ${
                  data.notes
                    ? `<div>
                  <strong style="color: #78350f; font-size: 14px;">Notas adicionales:</strong>
                  <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px;">${data.notes}</p>
                </div>`
                    : ""
                }
              </div>
              `
                  : ""
              }

              <!-- Paid Reservation Notice -->
              ${
                data.pricePerPerson && data.pricePerPerson > 0
                  ? `
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">
                  💳 Reserva con pago
                </h3>
                <p style="margin: 0 0 8px; color: #1e3a8a; font-size: 15px;">
                  Esta reserva requiere un pago. Nos pondremos en contacto para coordinar el mismo.
                </p>
                <div style="background-color: #dbeafe; border-radius: 8px; padding: 12px; margin-top: 12px;">
                  <p style="margin: 0; color: #1e40af; font-size: 16px;">
                    <strong>Total:</strong> ${formatCurrency(data.pricePerPerson * data.guests)}
                  </p>
                  <p style="margin: 4px 0 0; color: #1e3a8a; font-size: 13px;">
                    (${data.guests} ${data.guests === 1 ? "persona" : "personas"} × ${formatCurrency(data.pricePerPerson)})
                  </p>
                </div>
              </div>
              `
                  : ""
              }

              <!-- Pending notice -->
              ${
                !isConfirmed
                  ? `
              <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 15px;">
                  ⏳ Te enviaremos un correo de confirmación una vez que tu reserva sea procesada.
                </p>
              </div>
              `
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Este es un correo automático. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
