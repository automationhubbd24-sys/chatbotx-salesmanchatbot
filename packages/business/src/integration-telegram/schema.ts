import {
  createSelectSchema,
  integrationTelegramModel,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import type { z } from "zod"

export const integrationTelegramResource = createSelectSchema(
  integrationTelegramModel,
  {
    id: zodBigintAsString(),
    inboxId: zodBigintAsString(),
    workspaceId: zodBigintAsString(),
  },
)

export type IntegrationTelegramResource = z.infer<
  typeof integrationTelegramResource
>
