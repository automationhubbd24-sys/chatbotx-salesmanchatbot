import { defineRelationsPart } from "drizzle-orm"
// biome-ignore lint/performance/noNamespaceImport: drizzle schema
import * as schema from "../schema"

export const integrationOpenaiCompatibleEmbeddingRelations = defineRelationsPart(
  schema,
  (r) => ({
    integrationOpenaiCompatibleEmbeddingModel: {
      integration: r.one.integrationModel({
        from: r.integrationOpenaiCompatibleEmbeddingModel.integrationId,
        to: r.integrationModel.id,
      }),
    },
  }),
)
