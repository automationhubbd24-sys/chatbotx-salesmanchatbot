import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  compatibleEmbedding: vi.fn(),
  findFirstCompatibleEmbedding: vi.fn(),
  findFirstGemini: vi.fn(),
  findFirstOpenai: vi.fn(),
  geminiEmbedding: vi.fn(),
  openaiEmbedding: vi.fn(),
}))

vi.mock("@chatbotx.io/database/client", () => ({
  db: {
    query: {
      integrationGeminiModel: { findFirst: mocks.findFirstGemini },
      integrationOpenaiCompatibleEmbeddingModel: {
        findFirst: mocks.findFirstCompatibleEmbedding,
      },
      integrationOpenaiModel: { findFirst: mocks.findFirstOpenai },
    },
  },
}))

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({ embedding: mocks.geminiEmbedding }),
}))

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ embedding: mocks.openaiEmbedding }),
}))

vi.mock("../src/server/openai-compatible", () => ({
  createOpenaiCompatibleTextEmbeddingModelInstance: mocks.compatibleEmbedding,
}))

const { resolveEmbeddingModel } = await import("../src/server/embedding-model")

describe("resolveEmbeddingModel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirstCompatibleEmbedding.mockResolvedValue(undefined)
    mocks.findFirstOpenai.mockResolvedValue(undefined)
    mocks.findFirstGemini.mockResolvedValue({
      auth: { authType: "secretText", secretText: "gemini-key" },
    })
    mocks.geminiEmbedding.mockReturnValue("gemini-embedding-model")
  })

  test("prefers the dedicated OpenAI-compatible text embedding integration", async () => {
    const integration = {
      auth: { authType: "secretText", secretText: "compatible-key" },
      baseURL: "https://embeddings.example.com/v1",
      embeddingModel: "text-embedding-3-large",
      enabled: true,
    }
    mocks.findFirstCompatibleEmbedding.mockResolvedValue(integration)
    mocks.compatibleEmbedding.mockReturnValue("compatible-embedding-model")

    await expect(resolveEmbeddingModel("workspace-1")).resolves.toEqual({
      model: "compatible-embedding-model",
      provider: "openaiCompatibleEmbedding",
    })

    expect(mocks.compatibleEmbedding).toHaveBeenCalledWith({ integration })
    expect(mocks.findFirstOpenai).not.toHaveBeenCalled()
    expect(mocks.geminiEmbedding).not.toHaveBeenCalled()
  })

  test("falls back to OpenAI when no dedicated compatible embedding is enabled", async () => {
    mocks.findFirstOpenai.mockResolvedValue({
      auth: { authType: "secretText", secretText: "openai-key" },
    })
    mocks.openaiEmbedding.mockReturnValue("openai-embedding-model")

    await expect(resolveEmbeddingModel("workspace-1")).resolves.toEqual({
      model: "openai-embedding-model",
      provider: "openai",
    })

    expect(mocks.openaiEmbedding).toHaveBeenCalledWith("text-embedding-ada-002")
    expect(mocks.geminiEmbedding).not.toHaveBeenCalled()
  })

  test("resolves Gemini when it is the only configured provider", async () => {
    await expect(resolveEmbeddingModel("workspace-1")).resolves.toEqual({
      model: "gemini-embedding-model",
      provider: "gemini",
    })

    expect(mocks.geminiEmbedding).toHaveBeenCalledWith("gemini-embedding-001")
    expect(mocks.openaiEmbedding).not.toHaveBeenCalled()
  })
})
