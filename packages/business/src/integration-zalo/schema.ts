import {
  createSelectSchema,
  integrationZaloModel,
} from "@salesmanchatbot.io/database/schema"
import { z } from "zod"

export const integrationZaloResource = createSelectSchema(
  integrationZaloModel,
  {
    id: z.string(),
    inboxId: z.string(),
  },
).pick({
  id: true,
  name: true,
})

export type IntegrationZaloResource = z.infer<typeof integrationZaloResource>
