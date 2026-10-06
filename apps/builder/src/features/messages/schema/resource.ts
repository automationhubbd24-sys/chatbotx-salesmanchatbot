import { createSelectSchema, messageModel } from "@chatbotx.io/database/schema"
import { zodBigintAsString } from "@chatbotx.io/utils"
import z from "zod"
import { attachmentResource } from "@/features/attachments/schema/resource"
import { contactResource } from "@/features/contacts/schema/resource"
import { userResource } from "@/features/users/schema/resource"

export const messageResource = createSelectSchema(messageModel, {
  id: z.string(),
  conversationId: z.string(),
  workspaceId: z.string(),
  contactInboxId: z.string(),
}).and(
  z.object({
    clientId: zodBigintAsString().optional(),
  }),
)
export type MessageResource = z.infer<typeof messageResource>

export const parentPreviewResource = messageResource
  .pick({
    id: true,
    sourceId: true,
    text: true,
    contentType: true,
    messageType: true,
    senderType: true,
    deletedAt: true,
    type: true,
  })
  .and(z.object({ attachments: z.array(attachmentResource).optional() }))

export const messageResourceWithRelations = messageResource.and(
  z.object({
    attachmentCount: z.number().optional(),
    attachments: z.array(attachmentResource).optional(),
    user: userResource.optional(),
    contact: contactResource.optional(),
    clientId: zodBigintAsString().optional(),
    parent: parentPreviewResource.nullable().optional(),
  }),
)
export type MessageResourceWithRelations = z.infer<
  typeof messageResourceWithRelations
>
