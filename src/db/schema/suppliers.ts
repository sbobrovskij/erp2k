import { bigserial, boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const suppliers = pgTable('suppliers', {
  id:            bigserial('id', { mode: 'number' }).primaryKey(),
  name:          varchar('name', { length: 255 }).notNull(),
  legalName:     varchar('legal_name', { length: 255 }),
  inn:           varchar('inn', { length: 20 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone:         varchar('phone', { length: 50 }),
  email:         varchar('email', { length: 255 }),
  address:       text('address'),
  notes:         text('notes'),
  isActive:      boolean('is_active').notNull().default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Supplier       = typeof suppliers.$inferSelect
export type InsertSupplier = typeof suppliers.$inferInsert
