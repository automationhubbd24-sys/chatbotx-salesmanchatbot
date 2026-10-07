import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findFirstGemini: vi.fn(),
  findFirstOpenai: vi.fn(),
  findFirstOpenaiCompatible: vi.fn(),
  geminiEmbedding: vi.fn(),
  openaiCompatibleEmbedding: vi.fn(),
  openaiEmbedding: vi.fn(),
}))

vi.mock("@chatbotx.io/database/client", () => ({
  db: {
    query: {
      integrationGeminiModel: { findFirst: mocks.findFirstGemini },
      integrationOpenaiCompatibleModel: {
        findFirst: mocks.findFirstOpenaiCompatible,
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

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({
    embeddingModel: mocks.openaiCompatibleEmbedding,
  }),
}))

const { resolveEmbeddingModel } = await import("../src/server/embedding-model")

describe("resolveEmbeddingModel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirstOpenai.mockResolvedValue(undefined)
    mocks.findFirstOpenaiCompatible.mockResolvedValue(undefined)
    mocks.findFirstGemini.mockResolvedValue({
      auth: { authType: "secretText", secretText: "gemini-key" },
    })
    mocks.geminiEmbedding.mockReturnValue("gemini-embedding-model")
    mocks.openaiCompatibleEmbedding.mockReturnValue(
      "openai-compatible-embedding-model",
    )
  })

  test("resolves OpenAI-compatible when no first-party OpenAI exists and embedding model is configured", async () => {
    mocks.findFirstOpenaiCompatible.mockResolvedValue({
      auth: { authType: "secretText", secretText: "compatible-key" },
      baseURL: "https://example.com/v1",
      embeddingModel: "compatible-embedding-model",
      enabled: true,
      preset: "custom",
    })

    await expect(resolveEmbeddingModel("workspace-1")).resolves.toEqual({
      model: "openai-compatible-embedding-model",
      provider: "openaiCompatible",
    })

    expect(mocks.openaiCompatibleEmbedding).toHaveBeenCalledWith(
      "compatible-embedding-model",
    )
    expect(mocks.geminiEmbedding).not.toHaveBeenCalled()
    expect(mocks.openaiEmbedding).not.toHaveBeenCalled()
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
