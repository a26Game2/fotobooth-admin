export type BookingStatus =
  | "NEW"
  | "CONTACTED"
  | "QUOTED"
  | "DEPOSIT_PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
export type BookingAddon = {
  id?: string;
  itemName?: string;
  name?: string;
  quantity?: number;
  totalPrice?: number;
  price?: number;
  defaultPrice?: number;
  extraBlocks?: number;
  incrementPrice?: number;
};
export type Booking = {
  id: string;
  bookingCode?: string;
  code?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  eventDate?: string;
  eventType?: string;
  eventLocation?: string;
  status: BookingStatus;
  totalPrice?: number;
  totalAmount?: number;
  estimatedTotal?: number;
  subtotal?: number;
  basePrice?: number;
  extraHourAmount?: number;
  extraHourPrice?: number;
  extraHours?: number;
  travelFee?: number;
  vatAmount?: number;
  vatRate?: number;
  createdAt?: string;
  service?: { id: string; name: string };
  servicePackage?: { id?: string; name?: string; code?: string };
  city?: { id: string; name: string };
  options?: { name: string; price?: number }[];
  addons?: BookingAddon[];
  notes?: {
    id: string;
    note: string;
    createdBy?: string;
    createdAt?: string;
  }[];
  configurationSnapshot?: unknown;
  uploadedFiles?: { name?: string; url?: string; path?: string }[];
};
export type Service = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImagePath?: string;
  startingPrice?: number;
  isActive: boolean;
  optionGroups?: OptionGroup[];
};
export type OptionGroup = {
  id: string;
  name?: string;
  key: "duration" | "print" | "merchandise";
  serviceId?: string;
  sortOrder?: number;
  options?: ServiceOption[];
};
export type ServiceOption = {
  id: string;
  groupId?: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
};
export type City = {
  id: string;
  name: string;
  slug: string;
  isAvailable: boolean;
  defaultTravelFee?: number;
  note?: string;
  sortOrder?: number;
};
