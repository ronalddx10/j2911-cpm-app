export interface Client {
  id: string;
  clientType: 'INDIVIDUAL' | 'COMPANY' | 'GOVERNMENT' | 'NON_PROFIT' | 'ORGANIZATION';
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  officeId?: string;
  office?: { officeName: string };
  email: string;
  phone: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactEmail?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface Venue {
  id: string;
  venueName: string;
  capacity: number;
  physicalAddress: string;
}

export interface MenuCatalog {
  id: string;
  title: string;
  description: string;
  baseRate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  menuItems: Array<{ itemId: string; item: { id?: string; itemName: string; category: string } }>;
}

export interface ServiceType {
  id: string;
  serviceName: string;
}

export interface CatalogData {
  offices: Array<{ id: string; officeName: string }>;
  serviceTypes: ServiceType[];
  venues: Venue[];
  menus: MenuCatalog[];
}

export interface OrderStatus {
  id: string;
  statusName: string;
}

export interface Item {
  id: string;
  itemName: string;
  category: string;
  unitPrice: string;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface MealPeriodItem {
  id: string;
  mealPeriodId: string;
  itemId: string;
  item: {
    id: string;
    itemName: string;
    category: string;
    unitPrice: string;
  };
}

export interface MealPeriodEntry {
  id: string;
  menuId: string | null;
  pax: number;
  rate: string;
  mealPeriod: string; // 'Breakfast' | 'AM Snack' | 'Lunch' | 'PM Snack' | 'Dinner'
  customName?: string | null;
  serviceTime?: string | null;
  menu?: MenuCatalog | null;
  mealPeriodItems?: MealPeriodItem[];
}

export interface OrderDay {
  id: string;
  eventDate: string;
  mealPeriods: MealPeriodEntry[];
}

export interface OrderHistoryLog {
  id: string;
  orderId: string;
  fromStatusId: string;
  toStatusId: string;
  changedByUserId: string;
  remarks: string;
  createdAt: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  changedByUser?: { username: string };
}

export interface OrderAttachment {
  id: string;
  orderId: string;
  documentType: 'PURCHASE_ORDER' | 'DELIVERY_RECEIPT' | 'SIGNED_DELIVERY_RECEIPT' | 'OTHER';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
  isApproved: boolean;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  uploadedByUserId?: string | null;
  createdAt: string;
  approvedByUser?: { username: string };
  uploadedByUser?: { username: string };
}

export interface Order {
  id: string;
  clientId: string;
  venueId?: string;
  eventName?: string;
  unitNumber?: string;
  floorNumber?: string;
  buildingName?: string;
  streetNumber?: string;
  streetName?: string;
  landmark?: string;
  customDeliveryAddress?: string;
  serviceTypeId: string;
  statusId: string;
  pax: number;
  ingressTime?: string;
  egressTime?: string;
  grandTotal: string;
  pdfGeneratedFlag: boolean;
  pdfFilePath?: string;
  specialInstructions?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  client: Client;
  venue?: Venue;
  serviceType: { serviceName: string };
  status: OrderStatus;
  orderDays: OrderDay[];
  history: OrderHistoryLog[];
  attachments?: OrderAttachment[];
}
