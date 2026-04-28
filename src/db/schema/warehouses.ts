import { bigserial, boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const warehouses = pgTable('warehouses', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  address:   text('address'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const subWarehouses = pgTable('sub_warehouses', {
  id:         bigserial('id', { mode: 'number' }).primaryKey(),
  name:       varchar('name', { length: 255 }).notNull(),
  marketplace: varchar('marketplace', { length: 30 }).notNull().default('own'),
  externalId: varchar('external_id', { length: 100 }),
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Warehouse          = typeof warehouses.$inferSelect
export type SubWarehouse       = typeof subWarehouses.$inferSelect
export type InsertSubWarehouse = typeof subWarehouses.$inferInsert
