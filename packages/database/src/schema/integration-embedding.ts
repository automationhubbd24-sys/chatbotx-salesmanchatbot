import { boolean, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { bigintAsString, sharedColumns } from "../partials/shared"
import { integrationModel } from "./integration-base"
import { workspaceModel } from "./workspace"

export const integrationEmbeddingModel = pgTable(
  "IntegrationEmbedding",
  {
    ...sharedColumns,
    auth: jsonb(),
    baseURL: text().notNull(),
    enabled: boolean().default(true).notNull(),
    integrationId: bigintAsString()
      .notNull()
      .references(() => integrationModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    model: text().notNull(),
    workspaceId: bigintAsString()
      .notNull()
      .references(() => workspaceModel.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("IntegrationEmbedding_workspaceId_key").using(
      "btree",
      table.workspaceId.asc().nullsLast(),
    ),
    uniqueIndex("IntegrationEmbedding_integrationId_key").using(
      "btree",
      table.integrationId.asc().nullsLast(),
    ),
  ],
)
