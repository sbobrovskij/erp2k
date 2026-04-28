import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { purchasesService } from './purchases.service'
import {
  listPurchasesSchema,
  createPurchaseSchema,
  updatePurchaseSchema,
  addLineSchema,
  updateLineSchema,
} from './purchases.schemas'

const idSchema = z.object({ id: z.number().int().positive() })

export const purchasesRouter = router({

  // ── Purchases ──────────────────────────────────────────────

  list: protectedProcedure
    .input(listPurchasesSchema)
    .query(({ input }) => purchasesService.list(input)),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ input }) => purchasesService.getById(input.id)),

  create: protectedProcedure
    .input(createPurchaseSchema)
    .mutation(({ input, ctx }) => purchasesService.create(input, ctx.user.id)),

  update: protectedProcedure
    .input(idSchema.merge(z.object({ data: updatePurchaseSchema })))
    .mutation(({ input }) => purchasesService.update(input.id, input.data)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ input }) => purchasesService.delete(input.id)),

  changeStatus: protectedProcedure
    .input(idSchema.merge(z.object({ statusId: z.number().int().positive() })))
    .mutation(({ input }) => purchasesService.changeStatus(input.id, input.statusId)),

  // Провести закупку → создаёт поступление
  post: protectedProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => purchasesService.post(input.id, ctx.user.id)),

  // ── Lines ──────────────────────────────────────────────────

  addLine: protectedProcedure
    .input(addLineSchema)
    .mutation(({ input }) => purchasesService.addLine(input)),

  updateLine: protectedProcedure
    .input(idSchema.merge(z.object({ data: updateLineSchema })))
    .mutation(({ input }) => purchasesService.updateLine(input.id, input.data)),

  removeLine: protectedProcedure
    .input(idSchema)
    .mutation(({ input }) => purchasesService.removeLine(input.id)),

  // ── Files ──────────────────────────────────────────────────

  addFile: protectedProcedure
    .input(z.object({
      purchaseId: z.number().int().positive(),
      fileName:   z.string().min(1),
      filePath:   z.string().min(1),
    }))
    .mutation(({ input, ctx }) =>
      purchasesService.addFile(input.purchaseId, input.fileName, input.filePath, ctx.user.id)
    ),

  removeFile: protectedProcedure
    .input(idSchema)
    .mutation(({ input }) => purchasesService.removeFile(input.id)),
})

export type PurchasesRouter = typeof purchasesRouter
