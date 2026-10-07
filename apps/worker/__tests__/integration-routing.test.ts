import { beforeEach, describe, expect, test, vi } from "vitest"

const { resolveIncomingMessageRouting } = await import(
  "../src/integration/routing"
)

const conversation = {
  id: "conversation-1",
  workspaceId: "workspace-1",
  additionalAttributes: {},
}

const challengeConversation = {
  ...conversation,
  additionalAttributes: {
    challenge: { type: "step", data: { stepId: "step-1" } },
  },
}

describe("resolveIncomingMessageRouting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("does not route pending challenges when bot automation is inactive", async () => {
    const isConversationActive = vi.fn(async () => false)

    await expect(
      resolveIncomingMessageRouting({
        conversation: challengeConversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: true,
        hasText: true,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "none" })

    expect(isConversationActive).toHaveBeenCalledWith(challengeConversation)
  })

  test("routes pending challenges after bot automation is confirmed active", async () => {
    const isConversationActive = vi.fn(async () => true)

    await expect(
      resolveIncomingMessageRouting({
        conversation: challengeConversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: true,
        hasText: true,
        isConversationActive,
      }),
    ).resolves.toEqual({
      type: "challenge",
      conversation: challengeConversation,
      challenge: challengeConversation.additionalAttributes.challenge,
    })
  })

  test("routes an attachment-only reply to a pending challenge", async () => {
    const isConversationActive = vi.fn(async () => true)

    await expect(
      resolveIncomingMessageRouting({
        conversation: challengeConversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: false,
        hasText: false,
        isConversationActive,
      }),
    ).resolves.toEqual({
      type: "challenge",
      conversation: challengeConversation,
      challenge: challengeConversation.additionalAttributes.challenge,
    })
  })

  test("routes supported attachment-only messages to automated response", async () => {
    const isConversationActive = vi.fn(async () => true)

    await expect(
      resolveIncomingMessageRouting({
        conversation: conversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: true,
        hasText: false,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "automatedResponse", conversation })
  })

  test("does not route non-readable attachment-only messages to automated response", async () => {
    const isConversationActive = vi.fn(async () => true)

    await expect(
      resolveIncomingMessageRouting({
        conversation: conversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: false,
        hasText: false,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "none" })
  })

  test("routes inactive inbound text to the handoff re-entry classifier", async () => {
    const isConversationActive = vi.fn(async () => false)

    await expect(
      resolveIncomingMessageRouting({
        conversation: conversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: true,
        hasText: true,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "handoffReentry", conversation })
  })

  test("does not route attachment-only inactive input to the handoff classifier", async () => {
    const isConversationActive = vi.fn(async () => false)

    await expect(
      resolveIncomingMessageRouting({
        conversation: conversation as never,
        hasActionableInput: true,
        hasAutomatedResponseInput: true,
        hasText: false,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "none" })
  })

  test("skips messages with no actionable input without checking bot automation", async () => {
    const isConversationActive = vi.fn(async () => true)

    await expect(
      resolveIncomingMessageRouting({
        conversation: conversation as never,
        hasActionableInput: false,
        hasAutomatedResponseInput: false,
        hasText: false,
        isConversationActive,
      }),
    ).resolves.toEqual({ type: "none" })

    expect(isConversationActive).not.toHaveBeenCalled()
  })
})
