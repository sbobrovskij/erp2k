import { z } from 'zod'

export const purchaseTypeSchema = z.enum(['purchase', 'return', 'movement'])

// ── Filters ────────────────────────────────────────────────────
export const listPurchasesSchema = z.object({
  statusId:   z.number().int().positive().optional(),
  type:       purchaseTypeSchema.optional(),
  supplierId: z.number().int().positive().optional(),
  managerId:  z.number().int().positive().optional(),
  search:     z.string().trim().optional(),
  page:       z.number().int().min(1).default(1),
  limit:      z.number().int().min(1).max(100).default(20),
})

// ── Create / Update ────────────────────────────────────────────
export const createPurchaseSchema = z.object({
  name:               z.string().trim().min(1).max(255),
  type:               purchaseTypeSchema.default('purchase'),
  statusId:           z.number().int().positive(),
  supplierId:         z.number().int().positive().optional(),
  managerId:          z.number().int().positive(),
  plannedWarehouseId: z.number().int().positive().optional(),
  exportDate:         z.string().date().optional(),
  exportTime:         z.string().regex(/^\d{2}:\d{2}$/).optional(),
  ticketNumber:       z.string().trim().max(100).optional(),
  invoiceNumber:      z.string().trim().max(100).optional(),
  notes:              z.string().trim().optional(),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()

// ── Lines ──────────────────────────────────────────────────────
export const addLineSchema = z.object({
  purchaseId: z.number().int().positive(),
  productId:  z.number().int().positive(),
  quantity:   z.number().positive(),
  price:      z.number().min(0),
})

export const updateLineSchema = z.object({
  quantity: z.number().positive().optional(),
  price:    z.number().min(0).optional(),
})

// ── Inferred types ─────────────────────────────────────────────
export type ListPurchasesInput  = z.infer<typeof listPurchasesSchema>
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>
export type AddLineInput        = z.infer<typeof addLineSchema>
export type UpdateLineInput     = z.infer<typeof updateLineSchema>
