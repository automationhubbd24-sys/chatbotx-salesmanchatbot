import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../schema"

export const productEmbeddingRelations = defineRelationsPart(schema, (r) => ({
  productEmbeddingModel: {
    product: r.one.productModel({
      from: r.productEmbeddingModel.productId,
      to: r.productModel.id,
    }),
    workspace: r.one.workspaceModel({
      from: r.productEmbeddingModel.workspaceId,
      to: r.workspaceModel.id,
    }),
  },
}))
