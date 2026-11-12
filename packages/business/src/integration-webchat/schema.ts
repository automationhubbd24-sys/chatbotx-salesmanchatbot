import {
  createSelectSchema,
  integrationWebchatModel,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import type { z } from "zod"

export const integrationWebchatResource = createSelectSchema(
  integrationWebchatModel,
  {
    id: zodBigintAsString(),
    inboxId: zodBigintAsString(),
  },
).pick({
  id: true,
  name: true,
})

export type IntegrationWebchatResource = z.infer<
  typeof integrationWebchatResource
>
