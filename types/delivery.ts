export type DeliveryWindowInput = {
  name: string;
  startTime: string; // "HH:mm"
  deliveryStartTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  daysOfWeek: string[];
  maxOrders?: number;
  isActive?: boolean;
};
