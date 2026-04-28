import { TRPCError }  from '@trpc/server'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db }            from '@/db/index'
import {
  purchases, purchaseLines, purchaseFiles, purchaseStatuses,
} from '@/db/schema/purchases'
import { receipts, receiptLines } from '@/db/schema/receipts'
import type {
  AddLineInput, CreatePurchaseInput, ListPurchasesInput, UpdateLineInput, UpdatePurchaseInput,
} from './purchases.schemas'

// Статусы, в которых разрешено редактирование строк и полей
const EDITABLE_STATUS_NAMES  = ['Черновик', 'Согласование'] as const
const DELETABLE_STATUS_NAMES = ['Черновик'] as const
const POSTABLE_STATUS_NAMES  = ['Подтверждено'] as const

// ── Helpers ────────────────────────────────────────────────────

async function getPurchaseOrThrow(id: number) {
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, id),
    with: { status: true },
  })
  if (!purchase) throw new TRPCError({ code: 'NOT_FOUND', message: 'Закупка не найдена' })
  return purchase
}

async function assertEditable(purchaseId: number) {
  const p = await getPurchaseOrThrow(purchaseId)
  if (!EDITABLE_STATUS_NAMES.includes(p.status.name as any)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Нельзя редактировать закупку в статусе "${p.status.name}"`,
    })
  }
  return p
}

async function assertDeletable(purchaseId: number) {
  const p = await getPurchaseOrThrow(purchaseId)
  if (!DELETABLE_STATUS_NAMES.includes(p.status.name as any)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Удалить можно только черновик' })
  }
}

// ── Purchases CRUD ─────────────────────────────────────────────

export const purchasesService = {

  async list(input: ListPurchasesInput) {
    const { page, limit, statusId, type, supplierId, managerId, search } = input

    const conditions = [
      statusId   ? eq(purchases.statusId,   statusId)   : undefined,
      type       ? eq(purchases.type,       type)        : undefined,
      supplierId ? eq(purchases.supplierId, supplierId)  : undefined,
      managerId  ? eq(purchases.managerId,  managerId)   : undefined,
      search     ? or(
        ilike(purchases.name,          `%${search}%`),
        ilike(purchases.ticketNumber,  `%${search}%`),
        ilike(purchases.invoiceNumber, `%${search}%`),
      ) : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[]

    const where = conditions.length ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db.query.purchases.findMany({
        where,
        with: { status: true, supplier: true, manager: true },
        orderBy: desc(purchases.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: sql<number>`count(*)::int` }).from(purchases).where(where),
    ])

    return { items, total, page, limit }
  },

  async getById(id: number) {
    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.id, id),
      with: {
        status:           true,
        supplier:         true,
        manager:          true,
        createdByUser:    true,
        plannedWarehouse: true,
        lines: { with: { product: true } },
        files: true,
      },
    })
    if (!purchase) throw new TRPCError({ code: 'NOT_FOUND', message: 'Закупка не найдена' })
    return purchase
  },

  async create(input: CreatePurchaseInput, userId: number) {
    const [purchase] = await db
      .insert(purchases)
      .values({ ...input, createdBy: userId })
      .returning()
    return purchase
  },

  async update(id: number, input: UpdatePurchaseInput) {
    await assertEditable(id)
    const [updated] = await db
      .update(purchases)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning()
    return updated
  },

  async delete(id: number) {
    await assertDeletable(id)
    await db.delete(purchases).where(eq(purchases.id, id))
  },

  async changeStatus(id: number, statusId: number) {
    await getPurchaseOrThrow(id)
    const [updated] = await db
      .update(purchases)
      .set({ statusId, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning()
    return updated
  },

  // «Провести» — создаёт поступление из закупки
  async post(id: number, userId: number) {
    return db.transaction(async (tx) => {
      const purchase = await tx.query.purchases.findFirst({
        where: eq(purchases.id, id),
        with: { status: true, lines: true },
      })

      if (!purchase) throw new TRPCError({ code: 'NOT_FOUND', message: 'Закупка не найдена' })

      if (!POSTABLE_STATUS_NAMES.includes(purchase.status.name as any)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Провести можно только подтверждённую закупку (сейчас: "${purchase.status.name}")`,
        })
      }
      if (!purchase.lines.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Закупка не содержит строк' })
      }
      if (!purchase.plannedWarehouseId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Не указан планируемый склад' })
      }

      // Создаём поступление
      const [receipt] = await tx.insert(receipts).values({
        purchaseId:  id,
        warehouseId: purchase.plannedWarehouseId,
        createdBy:   userId,
        status:      'draft',
      }).returning()

      // Строки поступления = строки закупки
      await tx.insert(receiptLines).values(
        purchase.lines.map(line => ({
          receiptId:        receipt.id,
          purchaseLineId:   line.id,
          productId:        line.productId,
          quantityExpected: line.quantity,
          quantityReceived: '0',
        }))
      )

      // Переводим закупку в статус «Отправлено поставщику»
      const nextStatus = await tx.query.purchaseStatuses.findFirst({
        where: eq(purchaseStatuses.name, 'Отправлено поставщику'),
      })

      await tx.update(purchases).set({
        postedAt:  new Date(),
        statusId:  nextStatus?.id ?? purchase.statusId,
        updatedAt: new Date(),
      }).where(eq(purchases.id, id))

      return receipt
    })
  },

  // ── Lines ────────────────────────────────────────────────────

  async addLine(input: AddLineInput) {
    await assertEditable(input.purchaseId)
    const [line] = await db.insert(purchaseLines).values({
      purchaseId: input.purchaseId,
      productId:  input.productId,
      quantity:   String(input.quantity),
      price:      String(input.price),
    }).returning()
    return line
  },

  async updateLine(id: number, input: UpdateLineInput) {
    const line = await db.query.purchaseLines.findFirst({ where: eq(purchaseLines.id, id) })
    if (!line) throw new TRPCError({ code: 'NOT_FOUND', message: 'Строка не найдена' })
    await assertEditable(line.purchaseId)

    const values: Record<string, unknown> = { updatedAt: new Date() }
    if (input.quantity !== undefined) values.quantity = String(input.quantity)
    if (input.price    !== undefined) values.price    = String(input.price)

    const [updated] = await db.update(purchaseLines).set(values).where(eq(purchaseLines.id, id)).returning()
    return updated
  },

  async removeLine(id: number) {
    const line = await db.query.purchaseLines.findFirst({ where: eq(purchaseLines.id, id) })
    if (!line) throw new TRPCError({ code: 'NOT_FOUND', message: 'Строка не найдена' })
    await assertEditable(line.purchaseId)
    await db.delete(purchaseLines).where(eq(purchaseLines.id, id))
  },

  // ── Files ─────────────────────────────────────────────────────

  async addFile(purchaseId: number, fileName: string, filePath: string, userId: number) {
    await getPurchaseOrThrow(purchaseId)
    const [file] = await db.insert(purchaseFiles).values({
      purchaseId, fileName, filePath, uploadedBy: userId,
    }).returning()
    return file
  },

  async removeFile(fileId: number) {
    const file = await db.query.purchaseFiles.findFirst({ where: eq(purchaseFiles.id, fileId) })
    if (!file) throw new TRPCError({ code: 'NOT_FOUND', message: 'Файл не найден' })
    await db.delete(purchaseFiles).where(eq(purchaseFiles.id, fileId))
  },
}
