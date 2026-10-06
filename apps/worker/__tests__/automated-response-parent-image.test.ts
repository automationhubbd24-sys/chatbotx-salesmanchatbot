import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findTriggerMessage: vi.fn(),
  findAIContextMessages: vi.fn(),
  replyByAI: vi.fn(),
}))

vi.mock("@chatbotx.io/ai", () => ({
  AI_MESSAGE_HISTORY_LOOKBACK_MS: 60_000,
  MAX_CONVERSATION_HISTORY: 100,
  systemFunctionNames: { imageReader: "imageReader" },
}))

vi.mock("@chatbotx.io/ai/server", () => ({
  aiContextService: {
    getOrInitContext: vi.fn(async () => null),
    mapContextToModelMessages: vi.fn(() => []),
    mapDbMessagesToContext: vi.fn(() => []),
  },
}))

vi.mock("@chatbotx.io/automated-response", () => ({
  automatedResponseService: { process: vi.fn(async () => false) },
  getAutomatedResponseKey: vi.fn(() => "automated-response-key"),
}))

vi.mock("@chatbotx.io/business", () => ({
  aiAgentService: {
    findDefault: vi.fn(async () => ({
      id: "agent-1",
      models: [{ provider: "openai", model: "gpt-4o" }],
    })),
  },
  workspaceService: {
    findById: vi.fn(async () => ({
      defaultReply: null,
      defaultReplyFrequency: "allTime",
      timezone: null,
    })),
    isActiveNow: vi.fn(() => true),
  },
}))

vi.mock("@chatbotx.io/redis", () => ({
  simpleQueue: { getAll: vi.fn(async () => []) },
}))

vi.mock("@chatbotx.io/database/errors", () => ({
  isMessageStorageError: vi.fn(() => false),
}))

vi.mock("@chatbotx.io/database/partials", () => ({
  aiAgentProviderModels: { parse: (models: unknown) => models },
  aiMessageRoles: { enum: { user: "user" } },
  defaultReplyFrequencies: {
    safeParse: (value: unknown) => ({ data: value }),
    enum: { allTime: "allTime" },
  },
}))

vi.mock("@chatbotx.io/database/repositories", () => ({
  createMessageRepository: vi.fn(async () => ({
    findTriggerMessage: mocks.findTriggerMessage,
    findAIContextMessages: mocks.findAIContextMessages,
  })),
  findConversationAIContextState: vi.fn(async () => null),
  getSafeSinceTime: vi.fn(() => new Date(0)),
}))

vi.mock("@chatbotx.io/event-bus", () => ({ emit: vi.fn() }))
vi.mock("@chatbotx.io/sdk", () => ({
  DOCX_MIME_TYPES: [],
  IMAGE_MIME_TYPES: ["image/jpeg", "image/png"],
  PDF_MIME_TYPES: [],
}))
vi.mock("universal-error-normalizer", () => ({ normalizeError: (error: unknown) => error }))
vi.mock("../src/chat/handlers/send-message", () => ({
  sendTypingToChannel: vi.fn(async () => undefined),
}))
vi.mock("../src/lib/db", () => ({
  detectConversationAndContactInbox: vi.fn(async () => ({
    conversation: { id: "conversation-1", workspaceId: "workspace-1" },
    contactInbox: {
      id: "contact-inbox-1",
      createdAt: new Date(),
      lastMessageAt: new Date(),
      channel: "webchat",
    },
  })),
}))
vi.mock("../src/lib/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock("../src/integration/handlers/shared/trigger-message", () => ({
  TRIGGER_MESSAGE_LOOKBACK_MS: 60_000,
}))
vi.mock("../src/integration/handlers/automated-response/default-reply", () => ({
  triggerDefaultReplyFlow: vi.fn(),
}))
vi.mock("../src/integration/handlers/automated-response/replies", () => ({
  replyByAI: mocks.replyByAI,
}))

const { processAutomatedResponse } = await import(
  "../src/integration/handlers/automated-response"
)

describe("processAutomatedResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findAIContextMessages.mockResolvedValue([])
    mocks.replyByAI.mockResolvedValue({ usedFallbackText: false })
    mocks.findTriggerMessage.mockImplementation(async ({ id }: { id: string }) => {
      if (id === "current-message") {
        return {
          id,
          senderType: "contact",
          text: "What color is this?",
          parentId: "parent-image-message",
          attachments: [],
          createdAt: new Date(),
        }
      }
      if (id === "parent-image-message") {
        return {
          id,
          senderType: "contact",
          text: null,
          parentId: null,
          attachments: [{ fileType: "image", mimeType: "image/jpeg" }],
          createdAt: new Date(),
        }
      }
      return null
    })
  })

  test("enables imageReader for a text reply to a parent image", async () => {
    await processAutomatedResponse({
      conversationId: "conversation-1",
      contactInboxId: "contact-inbox-1",
      messageId: "current-message",
    })

    expect(mocks.replyByAI).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedSystemFunctionIds: ["imageReader"],
        parentMessageId: "parent-image-message",
      }),
    )
    expect(mocks.replyByAI.mock.calls[0]?.[0].messages).toContainEqual(
      expect.objectContaining({
        content:
          'The customer replied to an earlier image. Inspect that replied-to image to answer the customer\'s current question: "What color is this?"',
      }),
    )
  })
})
