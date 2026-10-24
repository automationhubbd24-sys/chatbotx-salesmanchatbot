import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createOpenaiCompatibleModelInstance: vi.fn(),
  findByWorkspaceIdAndId: vi.fn(),
  getOpenaiCompatibleAutoReplyIntegrationInDB: vi.fn(),
  info: vi.fn(),
}))

vi.mock("@chatbotx.io/ai/server", () => ({
  createAIProviderInstance: vi.fn(),
  createOpenaiCompatibleModelInstance:
    mocks.createOpenaiCompatibleModelInstance,
  getAIIntegrationInDB: vi.fn(),
  getOpenaiCompatibleAutoReplyIntegrationInDB:
    mocks.getOpenaiCompatibleAutoReplyIntegrationInDB,
}))

vi.mock("@chatbotx.io/business", () => ({
  integrationOpenaiCompatibleService: {
    findByWorkspaceIdAndId: mocks.findByWorkspaceIdAndId,
  },
}))

vi.mock("../src/lib/logger", () => ({
  logger: { info: mocks.info },
}))

const { createReplyModel } = await import("../src/lib/ai/reply-model")

describe("createReplyModel OpenAI-compatible", () => {
  const providerInfo = {
    kind: "openaiCompatible" as const,
    integrationId: "configured-integration",
    model: "google/gemini-3.1-flash-lite",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("uses the Agent-bound integration when it is enabled for auto-reply", async () => {
    const integration = {
      id: "configured-integration",
      enabled: true,
      autoReply: true,
      streaming: false,
      name: "OpenRouter custom",
      preset: "custom",
    }
    mocks.findByWorkspaceIdAndId.mockResolvedValue(integration)
    mocks.createOpenaiCompatibleModelInstance.mockReturnValue("custom-model")

    const result = await createReplyModel({
      workspaceId: "workspace-1",
      providerInfo,
    })

    expect(
      mocks.getOpenaiCompatibleAutoReplyIntegrationInDB,
    ).not.toHaveBeenCalled()
    expect(mocks.createOpenaiCompatibleModelInstance).toHaveBeenCalledWith({
      integration,
      modelId: providerInfo.model,
    })
    expect(result).toEqual({ model: "custom-model", streaming: false })
  })

  test("uses the current enabled auto-reply integration when the stored binding is stale", async () => {
    const currentIntegration = {
      id: "current-integration",
      enabled: true,
      autoReply: true,
      streaming: true,
      name: "Current custom provider",
      preset: "custom",
    }
    mocks.findByWorkspaceIdAndId.mockResolvedValue(null)
    mocks.getOpenaiCompatibleAutoReplyIntegrationInDB.mockResolvedValue(
      currentIntegration,
    )
    mocks.createOpenaiCompatibleModelInstance.mockReturnValue("current-model")

    const result = await createReplyModel({
      workspaceId: "workspace-1",
      providerInfo,
    })

    expect(
      mocks.getOpenaiCompatibleAutoReplyIntegrationInDB,
    ).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
    })
    expect(mocks.createOpenaiCompatibleModelInstance).toHaveBeenCalledWith({
      integration: currentIntegration,
      modelId: providerInfo.model,
    })
    expect(result).toEqual({ model: "current-model", streaming: true })
  })

  test("skips the provider when there is no enabled auto-reply integration", async () => {
    mocks.findByWorkspaceIdAndId.mockResolvedValue(null)
    mocks.getOpenaiCompatibleAutoReplyIntegrationInDB.mockResolvedValue(null)

    const result = await createReplyModel({
      workspaceId: "workspace-1",
      providerInfo,
    })

    expect(result).toBeNull()
    expect(mocks.createOpenaiCompatibleModelInstance).not.toHaveBeenCalled()
  })
})
