import { relations } from 'drizzle-orm'
import { users }            from './users'
import { suppliers }        from './suppliers'
import { warehouses, subWarehouses } from './warehouses'
import { categories, products, productCategories, properties, productProperties } from './products'
import { purchaseStatuses, purchases, purchaseLines, purchaseFiles } from './purchases'
import { receipts, receiptLines, reservations } from './receipts'

// ── Users ──────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  managedPurchases: many(purchases, { relationName: 'manager' }),
  createdPurchases: many(purchases, { relationName: 'creator' }),
  uploadedFiles:    many(purchaseFiles),
  createdReceipts:  many(receipts),
  createdReservations: many(reservations),
}))

// ── Suppliers ──────────────────────────────────────────────────
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
}))

// ── Warehouses ─────────────────────────────────────────────────
export const warehousesRelations = relations(warehouses, ({ many }) => ({
  purchases: many(purchases),
  receipts:  many(receipts),
}))

export const subWarehousesRelations = relations(subWarehouses, ({ many }) => ({
  reservations: many(reservations),
}))

// ── Categories ─────────────────────────────────────────────────
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent:   one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parent' }),
  children: many(categories, { relationName: 'parent' }),
  products: many(productCategories),
}))

// ── Products ───────────────────────────────────────────────────
export const productsRelations = relations(products, ({ many }) => ({
  categories:  many(productCategories),
  properties:  many(productProperties),
  purchaseLines: many(purchaseLines),
  receiptLines:  many(receiptLines),
}))

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product:  one(products,    { fields: [productCategories.productId],  references: [products.id] }),
  category: one(categories,  { fields: [productCategories.categoryId], references: [categories.id] }),
}))

export const propertiesRelations = relations(properties, ({ many }) => ({
  productProperties: many(productProperties),
}))

export const productPropertiesRelations = relations(productProperties, ({ one }) => ({
  product:  one(products,    { fields: [productProperties.productId],  references: [products.id] }),
  property: one(properties,  { fields: [productProperties.propertyId], references: [properties.id] }),
}))

// ── Purchase statuses ──────────────────────────────────────────
export const purchaseStatusesRelations = relations(purchaseStatuses, ({ many }) => ({
  purchases: many(purchases),
}))

// ── Purchases ──────────────────────────────────────────────────
export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  status:           one(purchaseStatuses, { fields: [purchases.statusId],           references: [purchaseStatuses.id] }),
  supplier:         one(suppliers,        { fields: [purchases.supplierId],          references: [suppliers.id] }),
  manager:          one(users,            { fields: [purchases.managerId],           references: [users.id], relationName: 'manager' }),
  createdByUser:    one(users,            { fields: [purchases.createdBy],           references: [users.id], relationName: 'creator' }),
  plannedWarehouse: one(warehouses,       { fields: [purchases.plannedWarehouseId],  references: [warehouses.id] }),
  lines:            many(purchaseLines),
  files:            many(purchaseFiles),
  receipts:         many(receipts),
}))

export const purchaseLinesRelations = relations(purchaseLines, ({ one, many }) => ({
  purchase:     one(purchases, { fields: [purchaseLines.purchaseId], references: [purchases.id] }),
  product:      one(products,  { fields: [purchaseLines.productId],  references: [products.id] }),
  receiptLines: many(receiptLines),
}))

export const purchaseFilesRelations = relations(purchaseFiles, ({ one }) => ({
  purchase:   one(purchases, { fields: [purchaseFiles.purchaseId], references: [purchases.id] }),
  uploadedBy: one(users,     { fields: [purchaseFiles.uploadedBy], references: [users.id] }),
}))

// ── Receipts ───────────────────────────────────────────────────
export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  purchase:  one(purchases,  { fields: [receipts.purchaseId],  references: [purchases.id] }),
  warehouse: one(warehouses, { fields: [receipts.warehouseId], references: [warehouses.id] }),
  createdBy: one(users,      { fields: [receipts.createdBy],   references: [users.id] }),
  lines:     many(receiptLines),
}))

export const receiptLinesRelations = relations(receiptLines, ({ one, many }) => ({
  receipt:      one(receipts,      { fields: [receiptLines.receiptId],      references: [receipts.id] }),
  purchaseLine: one(purchaseLines, { fields: [receiptLines.purchaseLineId], references: [purchaseLines.id] }),
  product:      one(products,      { fields: [receiptLines.productId],      references: [products.id] }),
  reservations: many(reservations),
}))

export const reservationsRelations = relations(reservations, ({ one }) => ({
  receiptLine:  one(receiptLines,  { fields: [reservations.receiptLineId],  references: [receiptLines.id] }),
  subWarehouse: one(subWarehouses, { fields: [reservations.subWarehouseId], references: [subWarehouses.id] }),
  createdBy:    one(users,         { fields: [reservations.createdBy],      references: [users.id] }),
}))
