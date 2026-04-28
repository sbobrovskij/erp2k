import {
  bigint, bigserial, boolean, date, integer,
  numeric, pgEnum, pgTable, text, time, timestamp, varchar,
} from 'drizzle-orm/pg-core'
import { users }      from './users'
import { suppliers }  from './suppliers'
import { warehouses } from './warehouses'
import { products }   from './products'

export const purchaseTypeEnum = pgEnum('purchase_type', ['purchase', 'return', 'movement'])

export const purchaseStatuses = pgTable('purchase_statuses', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  name:      varchar('name', { length: 100 }).notNull().unique(),
  color:     varchar('color', { length: 7 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive:  boolean('is_active').notNull().default(true),
})

export const purchases = pgTable('purchases', {
  id:                   bigserial('id', { mode: 'number' }).primaryKey(),
  name:                 varchar('name', { length: 255 }).notNull(),
  type:                 purchaseTypeEnum('type').notNull().default('purchase'),
  statusId:             bigint('status_id',             { mode: 'number' }).notNull().references(() => purchaseStatuses.id),
  supplierId:           bigint('supplier_id',           { mode: 'number' }).references(() => suppliers.id),
  managerId:            bigint('manager_id',            { mode: 'number' }).notNull().references(() => users.id),
  createdBy:            bigint('created_by',            { mode: 'number' }).notNull().references(() => users.id),
  plannedWarehouseId:   bigint('planned_warehouse_id',  { mode: 'number' }).references(() => warehouses.id),
  exportDate:           date('export_date'),
  exportTime:           time('export_time'),
  ticketNumber:         varchar('ticket_number',  { length: 100 }),
  invoiceNumber:        varchar('invoice_number', { length: 100 }),
  notes:                text('notes'),
  postedAt:             timestamp('posted_at',    { withTimezone: true }),
  createdAt:            timestamp('created_at',   { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp('updated_at',   { withTimezone: true }).notNull().defaultNow(),
})

export const purchaseFiles = pgTable('purchase_files', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  purchaseId:  bigint('purchase_id', { mode: 'number' }).notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  fileName:    varchar('file_name', { length: 255 }).notNull(),
  filePath:    text('file_path').notNull(),
  uploadedBy:  bigint('uploaded_by', { mode: 'number' }).notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const purchaseLines = pgTable('purchase_lines', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  purchaseId:  bigint('purchase_id', { mode: 'number' }).notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId:   bigint('product_id',  { mode: 'number' }).notNull().references(() => products.id),
  quantity:    numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  price:       numeric('price',    { precision: 15, scale: 2 }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Purchase           = typeof purchases.$inferSelect
export type InsertPurchase     = typeof purchases.$inferInsert
export type PurchaseLine       = typeof purchaseLines.$inferSelect
export type InsertPurchaseLine = typeof purchaseLines.$inferInsert
export type PurchaseStatus     = typeof purchaseStatuses.$inferSelect
