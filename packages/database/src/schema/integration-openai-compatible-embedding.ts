import { boolean, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { bigintAsString, sharedColumns } from "../partials/shared"
import { integrationModel } from "./integration-base"
import { workspaceModel } from "./workspace"

export const integrationOpenaiCompatibleEmbeddingModel = pgTable(
  "IntegrationOpenaiCompatibleEmbedding",
  {
    ...sharedColumns,
    auth: jsonb().notNull(),
    baseURL: text().notNull(),
    embeddingModel: text().notNull(),
    enabled: boolean().default(true).notNull(),
    integrationId: bigintAsString()
      .notNull()
      .references(() => integrationModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    workspaceId: bigintAsString()
      .notNull()
      .references(() => workspaceModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("IntegrationOpenaiCompatibleEmbedding_workspaceId_key").using(
      "btree",
      table.workspaceId.asc().nullsLast(),
    ),
    uniqueIndex("IntegrationOpenaiCompatibleEmbedding_integrationId_key").using(
      "btree",
      table.integrationId.asc().nullsLast(),
    ),
  ],
)
