import { bigserial, boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  email:     varchar('email', { length: 255 }).notNull().unique(),
  password:  varchar('password', { length: 255 }).notNull(),
  role:      varchar('role', { length: 50 }).notNull().default('operator'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User        = typeof users.$inferSelect
export type InsertUser  = typeof users.$inferInsert
