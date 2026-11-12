import {
  createSelectSchema,
  whatsappFlowModel,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { z } from "zod"

export const whatsappFlowResource = createSelectSchema(whatsappFlowModel, {
  id: zodBigintAsString(),
  integrationWhatsappId: zodBigintAsString(),
  completedCount: zodBigintAsString(),
})
  .pick({
    id: true,
    name: true,
    sourceId: true,
    status: true,
    categories: true,
    validationErrors: true,
    completedCount: true,
    integrationWhatsappId: true,
    screens: true,
  })
  .extend({
    categories: z.unknown(),
    validationErrors: z.unknown(),
    screens: z.unknown(),
    integrationWhatsapp: z
      .object({
        id: z.string(),
        inboxId: z.string(),
      })
      .nullish(),
  })
export type WhatsappFlowResource = z.infer<typeof whatsappFlowResource>
