// Time slot types
export interface TimeSlot {
  id: string;
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: number;
  notes: string;
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
    timeFrom: "11:00",
    timeTo: "11:30",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    price: 0,
    notes: "Weekday lunch service",
  },
  {
    id: "2",
    timeFrom: "12:00",
    timeTo: "13:00",
    days: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    price: 0,
    notes: "Peak lunch hour - all days",
  },
  {
    id: "3",
    timeFrom: "19:00",
    timeTo: "20:00",
    days: ["friday", "saturday"],
    price: 25,
    notes: "Weekend peak dinner - premium pricing",
  },
  {
    id: "4",
    timeFrom: "18:00",
    timeTo: "19:00",
    days: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    price: 0,
    notes: "Early dinner - all days free",
  },
  {
    id: "5",
    timeFrom: "20:00",
    timeTo: "21:00",
    days: ["friday", "saturday", "sunday"],
    price: 15,
    notes: "Weekend late dinner",
  },
];
