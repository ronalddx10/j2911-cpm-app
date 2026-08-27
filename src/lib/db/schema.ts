import { pgTable, bigserial, bigint, varchar, timestamp, integer, text, boolean, numeric, date, time, primaryKey, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const offices = pgTable("cpm_offices", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  officeName: varchar("office_name").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const officesRelations = relations(offices, ({ many }) => ({
  clients: many(clients),
}));

export const clients = pgTable("cpm_clients", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  clientType: varchar("client_type").notNull(), // INDIVIDUAL, COMPANY, GOVERNMENT, NON_PROFIT (or legacy ORGANIZATION)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  organizationName: varchar("organization_name"),
  officeId: bigint("office_id", { mode: "bigint" }).references(() => offices.id, { onDelete: "restrict" }),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  secondaryContactName: varchar("secondary_contact_name"),
  secondaryContactPhone: varchar("secondary_contact_phone"),
  secondaryContactEmail: varchar("secondary_contact_email"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdByUserId: bigint("created_by_user_id", { mode: "bigint" }),
  updatedByUserId: bigint("updated_by_user_id", { mode: "bigint" }),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  office: one(offices, { fields: [clients.officeId], references: [offices.id] }),
  orders: many(orders),
}));

export const venues = pgTable("cpm_venues", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  venueName: varchar("venue_name").unique().notNull(),
  capacity: integer("capacity").notNull(),
  physicalAddress: text("physical_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const venuesRelations = relations(venues, ({ many }) => ({
  orders: many(orders),
}));

export const serviceTypes = pgTable("cpm_service_types", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  serviceName: varchar("service_name").unique().notNull(), // Packed | Buffet | Delivery
});

export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
  orders: many(orders),
}));

export const orderStatuses = pgTable("cpm_order_statuses", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  statusName: varchar("status_name").unique().notNull(), // DRAFT | PENDING | APPROVED | etc
});

export const orderStatusesRelations = relations(orderStatuses, ({ many }) => ({
  orders: many(orders),
  historyFrom: many(orderHistory, { relationName: "fromStatus" }),
  historyTo: many(orderHistory, { relationName: "toStatus" }),
}));

export const menus = pgTable("cpm_menus", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  title: varchar("title").unique().notNull(),
  description: text("description"),
  baseRate: numeric("base_rate", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdByUserId: bigint("created_by_user_id", { mode: "bigint" }),
  updatedByUserId: bigint("updated_by_user_id", { mode: "bigint" }),
});

export const menusRelations = relations(menus, ({ many }) => ({
  menuItems: many(menuItems),
  mealPeriods: many(mealPeriods),
}));

export const items = pgTable("cpm_items", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  itemName: varchar("item_name").unique().notNull(),
  category: varchar("category").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdByUserId: bigint("created_by_user_id", { mode: "bigint" }),
  updatedByUserId: bigint("updated_by_user_id", { mode: "bigint" }),
});

export const itemsRelations = relations(items, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItems = pgTable("cpm_menu_items", {
  menuId: bigint("menu_id", { mode: "bigint" }).references(() => menus.id, { onDelete: "restrict" }).notNull(),
  itemId: bigint("item_id", { mode: "bigint" }).references(() => items.id, { onDelete: "restrict" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.menuId, table.itemId] })
]);

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  menu: one(menus, { fields: [menuItems.menuId], references: [menus.id] }),
  item: one(items, { fields: [menuItems.itemId], references: [items.id] }),
}));

export const orders = pgTable("cpm_orders", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  clientId: bigint("client_id", { mode: "bigint" }).references(() => clients.id, { onDelete: "restrict" }).notNull(),
  venueId: bigint("venue_id", { mode: "bigint" }).references(() => venues.id, { onDelete: "restrict" }),
  eventName: varchar("event_name"),
  unitNumber: varchar("unit_number"),
  floorNumber: varchar("floor_number"),
  buildingName: varchar("building_name"),
  streetNumber: varchar("street_number"),
  streetName: varchar("street_name"),
  landmark: text("landmark"),
  customDeliveryAddress: text("custom_delivery_address"),
  serviceTypeId: bigint("service_type_id", { mode: "bigint" }).references(() => serviceTypes.id, { onDelete: "restrict" }).notNull(),
  statusId: bigint("status_id", { mode: "bigint" }).references(() => orderStatuses.id, { onDelete: "restrict" }).notNull(),
  pax: integer("pax").default(10).notNull(),
  ingressTime: time("ingress_time"),
  egressTime: time("egress_time"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
  pdfGeneratedFlag: boolean("pdf_generated_flag").default(false).notNull(),
  pdfFilePath: varchar("pdf_file_path"),
  specialInstructions: text("special_instructions"),
  createdByUserId: bigint("created_by_user_id", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, { fields: [orders.clientId], references: [clients.id] }),
  venue: one(venues, { fields: [orders.venueId], references: [venues.id] }),
  serviceType: one(serviceTypes, { fields: [orders.serviceTypeId], references: [serviceTypes.id] }),
  status: one(orderStatuses, { fields: [orders.statusId], references: [orderStatuses.id] }),
  orderDays: many(orderDays),
  history: many(orderHistory),
  attachments: many(orderAttachments),
}));

export const orderAttachments = pgTable("cpm_order_attachments", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  orderId: bigint("order_id", { mode: "bigint" }).references(() => orders.id, { onDelete: "cascade" }).notNull(),
  documentType: varchar("document_type").notNull(), // PURCHASE_ORDER | DELIVERY_RECEIPT | SIGNED_DELIVERY_RECEIPT | OTHER
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type"),
  isApproved: boolean("is_approved").default(false).notNull(),
  approvedByUserId: bigint("approved_by_user_id", { mode: "bigint" }).references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  uploadedByUserId: bigint("uploaded_by_user_id", { mode: "bigint" }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderAttachmentsRelations = relations(orderAttachments, ({ one }) => ({
  order: one(orders, { fields: [orderAttachments.orderId], references: [orders.id] }),
  approvedByUser: one(users, { fields: [orderAttachments.approvedByUserId], references: [users.id] }),
  uploadedByUser: one(users, { fields: [orderAttachments.uploadedByUserId], references: [users.id] }),
}));

export const orderDays = pgTable("cpm_order_days", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  orderId: bigint("order_id", { mode: "bigint" }).references(() => orders.id, { onDelete: "cascade" }).notNull(),
  eventDate: date("event_date").notNull(),
}, (table) => [
  unique("cpm_order_days_order_id_event_date_key").on(table.orderId, table.eventDate)
]);

export const orderDaysRelations = relations(orderDays, ({ one, many }) => ({
  order: one(orders, { fields: [orderDays.orderId], references: [orders.id] }),
  mealPeriods: many(mealPeriods),
}));

export const mealPeriods = pgTable("cpm_meal_periods", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  orderDayId: bigint("order_day_id", { mode: "bigint" }).references(() => orderDays.id, { onDelete: "cascade" }).notNull(),
  menuId: bigint("menu_id", { mode: "bigint" }).references(() => menus.id, { onDelete: "restrict" }),
  pax: integer("pax").notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  mealPeriod: varchar("meal_period").notNull(),
  customName: varchar("custom_name"),
  serviceTime: time("service_time"),
});

export const mealPeriodItems = pgTable("cpm_meal_period_items", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  mealPeriodId: bigint("meal_period_id", { mode: "bigint" }).references(() => mealPeriods.id, { onDelete: "cascade" }).notNull(),
  itemId: bigint("item_id", { mode: "bigint" }).references(() => items.id, { onDelete: "restrict" }).notNull(),
});

export const mealPeriodsRelations = relations(mealPeriods, ({ one, many }) => ({
  orderDay: one(orderDays, { fields: [mealPeriods.orderDayId], references: [orderDays.id] }),
  menu: one(menus, { fields: [mealPeriods.menuId], references: [menus.id] }),
  mealPeriodItems: many(mealPeriodItems),
}));

export const mealPeriodItemsRelations = relations(mealPeriodItems, ({ one }) => ({
  mealPeriod: one(mealPeriods, { fields: [mealPeriodItems.mealPeriodId], references: [mealPeriods.id] }),
  item: one(items, { fields: [mealPeriodItems.itemId], references: [items.id] }),
}));

export const orderHistory = pgTable("cpm_order_history", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  orderId: bigint("order_id", { mode: "bigint" }).references(() => orders.id, { onDelete: "cascade" }).notNull(),
  fromStatusId: bigint("from_status_id", { mode: "bigint" }).references(() => orderStatuses.id, { onDelete: "restrict" }).notNull(),
  toStatusId: bigint("to_status_id", { mode: "bigint" }).references(() => orderStatuses.id, { onDelete: "restrict" }).notNull(),
  changedByUserId: bigint("changed_by_user_id", { mode: "bigint" }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, { fields: [orderHistory.orderId], references: [orders.id] }),
  fromStatus: one(orderStatuses, { fields: [orderHistory.fromStatusId], references: [orderStatuses.id], relationName: "fromStatus" }),
  toStatus: one(orderStatuses, { fields: [orderHistory.toStatusId], references: [orderStatuses.id], relationName: "toStatus" }),
  changedByUser: one(users, { fields: [orderHistory.changedByUserId], references: [users.id] }),
}));

export const users = pgTable("cpm_users", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  username: varchar("username").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: varchar("role").notNull(), // USER or ADMIN
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
