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
  tables?: Array<{
    id: string;
    number: number;
    name?: string | null;
    capacity: number;
    isActive: boolean;
  }>;
}
