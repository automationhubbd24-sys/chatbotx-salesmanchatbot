import {
  AI_MESSAGE_HISTORY_LOOKBACK_MS,
  MAX_CONVERSATION_HISTORY,
} from "@salesmanchatbot.io/ai"
import { aiMessageRoles } from "@salesmanchatbot.io/database/partials"
import {
  createMessageRepository,
  findConversationAIContextState,
  getSafeSinceTime,
} from "@salesmanchatbot.io/database/repositories"
import type {
  ContactInboxModel,
  ConversationModel,
} from "@salesmanchatbot.io/database/types"
import type { AIGenerateTextSchema } from "@salesmanchatbot.io/flow-config"
import type { ModelMessage } from "ai"

export async function buildAIMessages(
  conversation: ConversationModel,
  contactInbox: ContactInboxModel,
  step: AIGenerateTextSchema,
): Promise<ModelMessage[]> {
  const messages: ModelMessage[] = []

  if (step.remember) {
    const contextState = await findConversationAIContextState({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
    })
    const messageRepository = await createMessageRepository()
    const lastMessages = await messageRepository.findAIContextMessages({
      conversationId: conversation.id,
      limit: MAX_CONVERSATION_HISTORY,
      markerMessageId: contextState?.aiContextLastMessageId ?? null,
      messageTypes: ["incoming", "outgoing"],
      sinceTime:
        getSafeSinceTime(
          contactInbox.lastMessageAt ?? conversation.lastActivityAt,
          AI_MESSAGE_HISTORY_LOOKBACK_MS,
        ) ?? new Date(0),
      textNotNull: true,
      workspaceId: conversation.workspaceId,
    })

    for (const message of lastMessages) {
      if (
        !message.text ||
        (message.messageType !== "incoming" &&
          message.messageType !== "outgoing")
      ) {
        continue
      }

      if (message.senderType === "contact") {
        messages.push({
          role: aiMessageRoles.enum.user,
          content: message.text,
        })
      } else {
        messages.push({
          role: aiMessageRoles.enum.assistant,
          content: message.text,
        })
      }
    }
  }

  if (step.text) {
    messages.push({
      role: aiMessageRoles.enum.user,
      content: step.text,
    })
  }

  return messages
}
