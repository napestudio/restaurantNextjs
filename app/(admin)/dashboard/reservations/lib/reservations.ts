// Reservation types
export interface Reservation {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  notes: string;
  createdAt: string;
}

export interface TimeSlot {
  id: number;
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: number;
}

// Mock initial reservations data
export const initialReservations: Reservation[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john@example.com",
    phone: "(555) 123-4567",
    date: "2024-01-15",
    time: "7:00 PM",
    guests: 4,
    status: "confirmed",
    notes: "Anniversary dinner, window seat preferred",
    createdAt: "2024-01-10",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "(555) 987-6543",
    date: "2024-01-15",
    time: "6:30 PM",
    guests: 2,
    status: "pending",
    notes: "First visit",
    createdAt: "2024-01-12",
  },
  {
    id: 3,
    name: "Mike Chen",
    email: "mike@example.com",
    phone: "(555) 456-7890",
    date: "2024-01-16",
    time: "12:00 PM",
    guests: 6,
    status: "confirmed",
    notes: "Business lunch, need quiet area",
    createdAt: "2024-01-11",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    email: "emily@example.com",
    phone: "(555) 321-0987",
    date: "2024-01-17",
    time: "7:30 PM",
    guests: 2,
    status: "confirmed",
    notes: "Celebrating birthday",
    createdAt: "2024-01-13",
  },
  {
    id: 5,
    name: "David Kim",
    email: "david@example.com",
    phone: "(555) 654-3210",
    date: "2024-01-17",
    time: "6:00 PM",
    guests: 8,
    status: "pending",
    notes: "Group dinner, dietary restrictions: 2 vegetarian, 1 gluten-free",
    createdAt: "2024-01-14",
  },
];

// Mock time slots
export const timeSlots: TimeSlot[] = [
  {
    id: 1,
    timeFrom: "11:00",
    timeTo: "11:30",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    price: 0,
  },
  {
    id: 2,
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
  },
  {
    id: 3,
    timeFrom: "19:00",
    timeTo: "20:00",
    days: ["friday", "saturday"],
    price: 25,
  },
  {
    id: 4,
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
  },
  {
    id: 5,
    timeFrom: "20:00",
    timeTo: "21:00",
    days: ["friday", "saturday", "sunday"],
    price: 15,
  },
];
