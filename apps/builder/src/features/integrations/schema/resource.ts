import {
  createSelectSchema,
  integrationModel,
} from "@salesmanchatbot.io/database/schema"
import z from "zod"

// Explicit `.pick()` so a future column added to `Integration` never
// silently enters the public contract.
export const publicIntegrationResource = createSelectSchema(integrationModel, {
  id: z.string(),
  workspaceId: z.string(),
}).pick({
  id: true,
  integrationType: true,
  createdAt: true,
  updatedAt: true,
})
