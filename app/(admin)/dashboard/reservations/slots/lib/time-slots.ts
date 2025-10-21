// Time slot types
export interface TimeSlot {
  id: string;
  name: string;
  startTime: Date | string;
  endTime: Date | string;
  daysOfWeek: string[];
  pricePerPerson: number | null;
  notes: string | null;
  moreInfoUrl: string | null;
  isActive: boolean;
  branchId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Day configuration
export const DAYS = [
  { value: "monday", label: "Lunes", short: "L" },
  { value: "tuesday", label: "Martes", short: "M" },
  { value: "wednesday", label: "Miércoles", short: "X" },
  { value: "thursday", label: "Jueves", short: "J" },
  { value: "friday", label: "Viernes", short: "V" },
  { value: "saturday", label: "Sábado", short: "S" },
  { value: "sunday", label: "Domingo", short: "D" },
] as const;

// Mock initial data
export const initialTimeSlots: TimeSlot[] = [
  {
    id: "1",
    name: "Almuerzo Entre Semana",
    startTime: "11:00",
    endTime: "11:30",
    daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    pricePerPerson: 0,
    notes: "Weekday lunch service",
    moreInfoUrl: null,
    isActive: true,
    branchId: "mock-branch-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Almuerzo Pico",
    startTime: "12:00",
    endTime: "13:00",
    daysOfWeek: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    pricePerPerson: 0,
    notes: "Peak lunch hour - all days",
    moreInfoUrl: null,
    isActive: true,
    branchId: "mock-branch-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Cena Fin de Semana Premium",
    startTime: "19:00",
    endTime: "20:00",
    daysOfWeek: ["friday", "saturday"],
    pricePerPerson: 25,
    notes: "Weekend peak dinner - premium pricing",
    moreInfoUrl: null,
    isActive: true,
    branchId: "mock-branch-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Cena Temprana",
    startTime: "18:00",
    endTime: "19:00",
    daysOfWeek: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    pricePerPerson: 0,
    notes: "Early dinner - all days free",
    moreInfoUrl: null,
    isActive: true,
    branchId: "mock-branch-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Cena Tardía Fin de Semana",
    startTime: "20:00",
    endTime: "21:00",
    daysOfWeek: ["friday", "saturday", "sunday"],
    pricePerPerson: 15,
    notes: "Weekend late dinner",
    moreInfoUrl: null,
    isActive: true,
    branchId: "mock-branch-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
