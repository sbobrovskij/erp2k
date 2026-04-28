import {
  bigint, bigserial, numeric, pgTable, text, timestamp, varchar,
} from 'drizzle-orm/pg-core'
import { users }         from './users'
import { warehouses, subWarehouses } from './warehouses'
import { products }      from './products'
import { purchases, purchaseLines } from './purchases'

export const receipts = pgTable('receipts', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  purchaseId:  bigint('purchase_id',  { mode: 'number' }).notNull().references(() => purchases.id),
  warehouseId: bigint('warehouse_id', { mode: 'number' }).notNull().references(() => warehouses.id),
  createdBy:   bigint('created_by',   { mode: 'number' }).notNull().references(() => users.id),
  status:      varchar('status', { length: 30 }).notNull().default('draft'),
  // draft | in_progress | completed | cancelled
  receivedAt:  timestamp('received_at', { withTimezone: true }),
  notes:       text('notes'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const receiptLines = pgTable('receipt_lines', {
  id:                bigserial('id', { mode: 'number' }).primaryKey(),
  receiptId:         bigint('receipt_id',       { mode: 'number' }).notNull().references(() => receipts.id,      { onDelete: 'cascade' }),
  purchaseLineId:    bigint('purchase_line_id', { mode: 'number' }).notNull().references(() => purchaseLines.id),
  productId:         bigint('product_id',       { mode: 'number' }).notNull().references(() => products.id),
  quantityExpected:  numeric('quantity_expected', { precision: 12, scale: 3 }).notNull(),
  quantityReceived:  numeric('quantity_received', { precision: 12, scale: 3 }).notNull().default('0'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reservations = pgTable('reservations', {
  id:               bigserial('id', { mode: 'number' }).primaryKey(),
  receiptLineId:    bigint('receipt_line_id',  { mode: 'number' }).notNull().references(() => receiptLines.id, { onDelete: 'cascade' }),
  subWarehouseId:   bigint('sub_warehouse_id', { mode: 'number' }).references(() => subWarehouses.id),
  quantity:         numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  status:           varchar('status', { length: 30 }).notNull().default('reserved'),
  // reserved | placed | released
  createdBy:        bigint('created_by', { mode: 'number' }).notNull().references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Receipt       = typeof receipts.$inferSelect
export type ReceiptLine   = typeof receiptLines.$inferSelect
export type Reservation   = typeof reservations.$inferSelect
