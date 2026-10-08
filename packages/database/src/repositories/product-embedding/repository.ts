import {
  and,
  type DatabaseClient,
  db,
  eq,
  inArray,
  or,
  sql,
} from "@chatbotx.io/database/client"
import { productEmbeddingModel, productModel } from "@chatbotx.io/database/schema"
import { createId } from "@chatbotx.io/utils"

export type ProductEmbeddingSearchInput = {
  workspaceId: string
  embedding: number[]
  categoryId?: string | null
  limit: number
  maxDistance: number
}

export type ProductEmbeddingUpsertInput = {
  productId: string
  workspaceId: string
  content: string
  contentHash: string
  model: string
  dimensions: number
  embedding: number[]
}

const inCategorySql = (categoryId?: string | null) =>
  categoryId
    ? or(
        eq(productModel.categoryId, categoryId),
        eq(productModel.subcategoryId, categoryId),
      )
    : undefined

export const productEmbeddingRepository = {
  async upsert(input: ProductEmbeddingUpsertInput, tx: DatabaseClient = db) {
    await tx
      .insert(productEmbeddingModel)
      .values({
        id: createId(),
        content: input.content,
        contentHash: input.contentHash,
        dimensions: input.dimensions,
        embedding: input.embedding,
        model: input.model,
        productId: input.productId,
        workspaceId: input.workspaceId,
      })
      .onConflictDoUpdate({
        target: productEmbeddingModel.productId,
        set: {
          content: input.content,
          contentHash: input.contentHash,
          dimensions: input.dimensions,
          embedding: input.embedding,
          model: input.model,
          updatedAt: sql`now()`,
        },
      })
  },

  async findCurrent(
    input: { productId: string; workspaceId: string; contentHash: string; model: string },
    tx: DatabaseClient = db,
  ) {
    return await tx.query.productEmbeddingModel.findFirst({
      columns: { id: true },
      where: {
        productId: input.productId,
        workspaceId: input.workspaceId,
        contentHash: input.contentHash,
        model: input.model,
      },
    })
  },

  async deleteByProductIds(
    input: { workspaceId: string; productIds: string[] },
    tx: DatabaseClient = db,
  ) {
    if (input.productIds.length === 0) {
      return
    }
    await tx
      .delete(productEmbeddingModel)
      .where(
        and(
          eq(productEmbeddingModel.workspaceId, input.workspaceId),
          inArray(productEmbeddingModel.productId, input.productIds),
        ),
      )
  },

  async search(input: ProductEmbeddingSearchInput, tx: DatabaseClient = db) {
    const distance = sql<number>`${productEmbeddingModel.embedding} <=> ${JSON.stringify(input.embedding)}::vector`
    const categoryFilter = inCategorySql(input.categoryId)
    const rows = await tx
      .select({ productId: productEmbeddingModel.productId, distance })
      .from(productEmbeddingModel)
      .innerJoin(productModel, eq(productEmbeddingModel.productId, productModel.id))
      .where(
        and(
          eq(productEmbeddingModel.workspaceId, input.workspaceId),
          eq(productModel.workspaceId, input.workspaceId),
          eq(productModel.isActive, true),
          eq(productModel.isSearchable, true),
          categoryFilter,
          sql`${distance} < ${input.maxDistance}`,
        ),
      )
      .orderBy(distance)
      .limit(input.limit)

    return rows
  },
}
