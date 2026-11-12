import {
  createSelectSchema,
  integrationInstagramModel,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import type { z } from "zod"

export const integrationInstagramResource = createSelectSchema(
  integrationInstagramModel,
  {
    id: zodBigintAsString(),
    inboxId: zodBigintAsString(),
  },
).pick({
  id: true,
  name: true,
  inboxId: true,
  username: true,
})

export type IntegrationInstagramResource = z.infer<
  typeof integrationInstagramResource
>
