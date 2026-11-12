import {
  createSelectSchema,
  integrationApiModel,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import type { z } from "zod"

export const apiResource = createSelectSchema(integrationApiModel, {
  id: zodBigintAsString(),
  inboxId: zodBigintAsString(),
  workspaceId: zodBigintAsString(),
}).pick({
  id: true,
  name: true,
  tokenPrefix: true,
  callbackUrl: true,
  enabled: true,
  createdAt: true,
})
export type ApiResource = z.infer<typeof apiResource>
