import { Clock } from "lucide-react";
import Avatar from "@/components/avatar";

type DeliveryWindow = {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
};

interface DeliveryClosedPageProps {
  reason?: string;
  windows: DeliveryWindow[];
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function formatTime(isoString: string): string {
  return isoString.slice(11, 16);
}

function formatDays(days: string[]): string {
  if (days.length === 7) return "Todos los días";
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekend = ["saturday", "sunday"];
  if (weekdays.every((d) => days.includes(d)) && days.length === 5)
    return "Días de semana";
  if (weekend.every((d) => days.includes(d)) && days.length === 2)
    return "Fin de semana";
  return days.map((d) => DAY_LABELS[d] ?? d).join(", ");
}

export default function DeliveryClosedPage({
  reason,
  windows,
}: DeliveryClosedPageProps) {
  return (
    <div className="min-h-svh bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <Avatar />
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-zinc-900 rounded-full p-5">
            <Clock className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3">Delivery cerrado</h1>

        <p className="text-gray-400 mb-8">
          {reason ??
            "El servicio de delivery no está disponible en este momento."}
        </p>

        {windows.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 text-left">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Horarios de delivery
            </h2>
            <ul className="space-y-4">
              {windows.map((w, i) => (
                <li key={i} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{w.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatDays(w.daysOfWeek)}
                    </p>
                  </div>
                  <span className="text-sm text-gray-300 whitespace-nowrap mt-0.5">
                    {formatTime(w.startTime)} – {formatTime(w.endTime)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
