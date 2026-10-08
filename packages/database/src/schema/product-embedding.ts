import { index, integer, pgTable, text, uniqueIndex, vector } from "drizzle-orm/pg-core"
import { bigintAsString, sharedColumns } from "../partials/shared"
import { productModel } from "./product"
import { workspaceModel } from "./workspace"

export const productEmbeddingModel = pgTable(
  "ProductEmbedding",
  {
    ...sharedColumns,
    productId: bigintAsString()
      .notNull()
      .references(() => productModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    workspaceId: bigintAsString()
      .notNull()
      .references(() => workspaceModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    content: text().notNull(),
    contentHash: text().notNull(),
    model: text().notNull(),
    dimensions: integer().default(3072).notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
  },
  (table) => [
    uniqueIndex("ProductEmbedding_productId_key").on(table.productId),
    index("ProductEmbedding_workspaceId_idx").using(
      "btree",
      table.workspaceId.asc().nullsLast(),
    ),
  ],
)
