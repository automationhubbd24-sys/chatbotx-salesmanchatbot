import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findAttachmentsByConversation: vi.fn(),
}))

vi.mock("@chatbotx.io/database/repositories", () => ({
  createConversationSourceRepository: () => ({
    findAttachmentsByConversation: mocks.findAttachmentsByConversation,
  }),
}))

const { resolveImageAttachment } = await import(
  "../src/integration/handlers/automated-response/system-tools/context-sources/image-source"
)

function attachment(input: {
  id: string
  messageId: string
  mimeType?: string
}) {
  return {
    id: input.id,
    messageId: input.messageId,
    mimeType: input.mimeType ?? "image/png",
  }
}

const input = {
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  messageId: "message-1",
  query: "What is this?",
}

describe("resolveImageAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("selects the only supported image on the trigger message", async () => {
    const triggerAttachment = attachment({
      id: "attachment-1",
      messageId: "message-1",
    })
    mocks.findAttachmentsByConversation.mockResolvedValue([
      attachment({ id: "attachment-2", messageId: "message-2" }),
      triggerAttachment,
    ])

    await expect(resolveImageAttachment(input)).resolves.toEqual({
      status: "selected",
      attachment: triggerAttachment,
    })
    expect(mocks.findAttachmentsByConversation).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      conversationId: "conversation-1",
      limit: 50,
    })
  })

  test("selects supported trigger images as a batch in repository order", async () => {
    const first = attachment({ id: "attachment-2", messageId: "message-1" })
    const second = attachment({ id: "attachment-1", messageId: "message-1" })
    mocks.findAttachmentsByConversation.mockResolvedValue([
      first,
      attachment({
        id: "audio-1",
        messageId: "message-1",
        mimeType: "audio/mpeg",
      }),
      second,
      attachment({
        id: "document-1",
        messageId: "message-1",
        mimeType: "application/pdf",
      }),
    ])

    await expect(resolveImageAttachment(input)).resolves.toEqual({
      status: "selected_batch",
      attachments: [first, second],
    })
  })

  test("selects ordered images across explicit trigger message ids", async () => {
    const first = attachment({ id: "attachment-1", messageId: "message-1" })
    const second = attachment({ id: "attachment-2", messageId: "message-2" })
    mocks.findAttachmentsByConversation.mockResolvedValue([second, first])

    await expect(
      resolveImageAttachment({
        ...input,
        triggerMessageIds: ["message-1", "message-2"],
      }),
    ).resolves.toEqual({
      status: "selected_batch",
      attachments: [first, second],
    })
  })

  test("selects parent images before a historical fallback", async () => {
    const parent = attachment({ id: "parent-image", messageId: "parent-message" })
    mocks.findAttachmentsByConversation.mockResolvedValue([
      attachment({ id: "historical-image", messageId: "historical-message" }),
      parent,
    ])

    await expect(
      resolveImageAttachment({ ...input, parentMessageId: "parent-message" }),
    ).resolves.toEqual({ status: "selected", attachment: parent })
  })

  test("selects current trigger images before replied-to parent images", async () => {
    const current = attachment({ id: "current-image", messageId: "message-1" })
    mocks.findAttachmentsByConversation.mockResolvedValue([
      attachment({ id: "parent-image", messageId: "parent-message" }),
      current,
    ])

    await expect(
      resolveImageAttachment({ ...input, parentMessageId: "parent-message" }),
    ).resolves.toEqual({ status: "selected", attachment: current })
  })

  test("selects the only conversation image for a text-only trigger", async () => {
    const conversationAttachment = attachment({
      id: "attachment-1",
      messageId: "message-with-image",
    })
    mocks.findAttachmentsByConversation.mockResolvedValue([
      conversationAttachment,
    ])

    await expect(resolveImageAttachment(input)).resolves.toEqual({
      status: "selected",
      attachment: conversationAttachment,
    })
  })

  test("returns ambiguity for a text-only trigger with multiple conversation images", async () => {
    mocks.findAttachmentsByConversation.mockResolvedValue([
      attachment({ id: "attachment-1", messageId: "message-with-image-1" }),
      attachment({ id: "attachment-2", messageId: "message-with-image-2" }),
    ])

    await expect(resolveImageAttachment(input)).resolves.toEqual({
      status: "ambiguous",
      context: "conversation",
      candidateCount: 2,
    })
  })

  test("returns not found when there are no supported images", async () => {
    mocks.findAttachmentsByConversation.mockResolvedValue([
      attachment({
        id: "attachment-1",
        messageId: "message-1",
        mimeType: "application/pdf",
      }),
    ])

    await expect(resolveImageAttachment(input)).resolves.toEqual({
      status: "not_found",
    })
  })
})
