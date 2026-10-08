import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../schema"

export const integrationEmbeddingRelations = defineRelationsPart(
  schema,
  (r) => ({
    integrationEmbeddingModel: {
      integration: r.one.integrationModel({
        from: r.integrationEmbeddingModel.integrationId,
        to: r.integrationModel.id,
      }),
    },
  }),
)
