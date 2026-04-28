import {
  bigint, bigserial, boolean, integer, numeric,
  pgTable, primaryKey, text, timestamp, varchar,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  parentId:  bigint('parent_id', { mode: 'number' }).references((): any => categories.id),
  name:      varchar('name', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable('products', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  sku:         varchar('sku', { length: 100 }).notNull().unique(),
  name:        varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  barcode:     varchar('barcode', { length: 100 }),
  unit:        varchar('unit', { length: 20 }).notNull().default('шт'),
  weightKg:    numeric('weight_kg', { precision: 10, scale: 3 }),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const productCategories = pgTable('product_categories', {
  productId:  bigint('product_id',  { mode: 'number' }).notNull().references(() => products.id,    { onDelete: 'cascade' }),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => categories.id,  { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.productId, t.categoryId] })])

export const properties = pgTable('properties', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  name:      varchar('name', { length: 255 }).notNull().unique(),
  valueType: varchar('value_type', { length: 20 }).notNull().default('text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const productProperties = pgTable('product_properties', {
  id:         bigserial('id', { mode: 'number' }).primaryKey(),
  productId:  bigint('product_id',  { mode: 'number' }).notNull().references(() => products.id,    { onDelete: 'cascade' }),
  propertyId: bigint('property_id', { mode: 'number' }).notNull().references(() => properties.id,  { onDelete: 'cascade' }),
  value:      text('value').notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Product        = typeof products.$inferSelect
export type InsertProduct  = typeof products.$inferInsert
export type Category       = typeof categories.$inferSelect
