"use server"

import { contactInboxService, conversationService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { createMessageRepository } from "@salesmanchatbot.io/database/repositories"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { ChatJobAction, chatQueue } from "@salesmanchatbot.io/worker-config"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type ChangeMessageAttributesRequest,
  changeMessageAttributesRequest,
} from "../schema/mutation"

export const changeMessageAttributes = async (props: {
  workspaceId: string
  conversationId: string
  parsedInput: ChangeMessageAttributesRequest
}) => {
  const { workspaceId, conversationId, parsedInput } = props
  const { messageId, createdAt, liked, hidden } = parsedInput

  const conversation = await conversationService.findByOrFail({
    where: { id: conversationId, workspaceId },
  })

  const repository = await createMessageRepository()
  const message = await repository.findById({
    id: messageId,
    createdAt,
    workspaceId,
  })
  if (!message || message.conversationId !== conversationId) {
    throw new salesmanChatbotException("Message not found")
  }

  const contactInbox = await contactInboxService.findBy({
    where: { id: message.contactInboxId },
  })
  if (!contactInbox) {
    throw new salesmanChatbotException("Inbox not found")
  }

  await Promise.allSettled([
    chatQueue.add(ChatJobAction.changeChannelMessageState, {
      type: ChatJobAction.changeChannelMessageState,
      data: {
        conversation,
        contactInbox,
        message: { id: messageId, createdAt: message.createdAt },
        liked,
        hidden,
      },
    }),
  ])

  return { success: true, messageId }
}

export const changeMessageAttributesAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(changeMessageAttributesRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, conversationId],
      parsedInput,
    } = props

    return await changeMessageAttributes({
      workspaceId,
      conversationId,
      parsedInput,
    })
  })
