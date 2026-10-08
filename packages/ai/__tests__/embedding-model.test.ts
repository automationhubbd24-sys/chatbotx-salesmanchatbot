import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findFirstEmbedding: vi.fn(),
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
      integrationEmbeddingModel: { findFirst: mocks.findFirstEmbedding },
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
    mocks.findFirstEmbedding.mockResolvedValue(undefined)
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

  test("resolves the dedicated embedding integration before chat providers", async () => {
    mocks.findFirstEmbedding.mockResolvedValue({
      auth: { authType: "secretText", secretText: "embedding-key" },
      baseURL: "https://embedding.example.com/v1",
      enabled: true,
      model: "embedding-model",
      preset: "custom",
    })
    mocks.findFirstOpenai.mockResolvedValue({
      auth: { authType: "secretText", secretText: "openai-key" },
    })

    await expect(resolveEmbeddingModel("workspace-1")).resolves.toEqual({
      model: "openai-compatible-embedding-model",
      provider: "embedding",
    })

    expect(mocks.openaiCompatibleEmbedding).toHaveBeenCalledWith(
      "embedding-model",
    )
    expect(mocks.findFirstOpenai).not.toHaveBeenCalled()
    expect(mocks.geminiEmbedding).not.toHaveBeenCalled()
    expect(mocks.openaiEmbedding).not.toHaveBeenCalled()
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
