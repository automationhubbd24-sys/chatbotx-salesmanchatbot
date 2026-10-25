import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deleteWhere: vi.fn(),
  findFirst: vi.fn(),
  insertReturning: vi.fn(),
  insertValues: vi.fn(),
  scheduleEmbeddingRefreshPage: vi.fn(),
  transaction: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  validateBaseUrl: vi.fn(async (baseURL: string) => baseURL.trim()),
}))

vi.mock("../src/integration-openai-compatible/validate-base-url", () => ({
  validateOpenaiCompatibleBaseUrlForEnvironment: mocks.validateBaseUrl,
}))

vi.mock("../src/audit/dispatcher", () => ({ dispatchAuditRecord: vi.fn() }))

vi.mock("../src/product", () => ({
  productService: {
    scheduleEmbeddingRefreshPage: mocks.scheduleEmbeddingRefreshPage,
  },
}))

vi.mock("@chatbotx.io/database/client", () => ({
  and: vi.fn(),
  db: {
    delete: vi.fn(() => ({ where: mocks.deleteWhere })),
    query: {
      integrationOpenaiCompatibleEmbeddingModel: {
        findFirst: mocks.findFirst,
      },
    },
    transaction: mocks.transaction,
    update: vi.fn(() => ({ set: mocks.updateSet })),
  },
  eq: vi.fn(),
}))

vi.mock("@chatbotx.io/database/schema", () => ({
  integrationModel: { id: "id" },
  integrationOpenaiCompatibleEmbeddingModel: {
    id: "id",
    workspaceId: "workspaceId",
  },
}))

vi.mock("@chatbotx.io/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@chatbotx.io/utils")>()),
  createId: vi.fn(() => "generated-id"),
}))

const { integrationOpenaiCompatibleEmbeddingService } = await import(
  "../src/integration-openai-compatible-embedding/service"
)

describe("IntegrationOpenaiCompatibleEmbeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirst.mockResolvedValue(undefined)
    mocks.insertReturning.mockResolvedValue([{ id: "integration-1" }])
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        insert: vi.fn(() => ({
          values: (data: unknown) => {
            mocks.insertValues(data)
            return { returning: mocks.insertReturning }
          },
        })),
      }),
    )
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere })
  })

  test("creates an isolated embedding integration with normalized endpoint and secret auth", async () => {
    mocks.validateBaseUrl.mockResolvedValue("https://embeddings.example.com/v1")

    await integrationOpenaiCompatibleEmbeddingService.connect({
      workspaceId: "workspace-1",
      apiKey: " secret ",
      baseURL: " https://embeddings.example.com/v1 ",
      embeddingModel: " text-embedding-3-large ",
    })

    expect(mocks.validateBaseUrl).toHaveBeenCalledWith(
      " https://embeddings.example.com/v1 ",
    )
    expect(mocks.insertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        integrationType: "openaiCompatibleEmbedding",
        workspaceId: "workspace-1",
      }),
    )
    expect(mocks.insertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        auth: { authType: "secretText", secretText: "secret" },
        baseURL: "https://embeddings.example.com/v1",
        embeddingModel: "text-embedding-3-large",
        enabled: true,
        integrationId: "integration-1",
        workspaceId: "workspace-1",
      }),
    )
    expect(mocks.scheduleEmbeddingRefreshPage).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
    })
  })

  test("updates only the integration scoped to the requested workspace", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "embedding-1",
      workspaceId: "workspace-1",
    })
    mocks.validateBaseUrl.mockResolvedValue("https://new.example.com/v1")

    await integrationOpenaiCompatibleEmbeddingService.update("workspace-1", {
      baseURL: " https://new.example.com/v1 ",
      embeddingModel: " new-model ",
      enabled: false,
    })

    expect(mocks.updateSet).toHaveBeenCalledWith({
      baseURL: "https://new.example.com/v1",
      embeddingModel: "new-model",
      enabled: false,
    })
    expect(mocks.updateWhere).toHaveBeenCalled()
    expect(mocks.scheduleEmbeddingRefreshPage).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
    })
  })

  test("deletes the parent integration and refreshes product embeddings on disconnect", async () => {
    mocks.findFirst.mockResolvedValue({ integrationId: "integration-1" })

    await integrationOpenaiCompatibleEmbeddingService.disconnect("workspace-1")

    expect(mocks.deleteWhere).toHaveBeenCalled()
    expect(mocks.scheduleEmbeddingRefreshPage).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
    })
  })
})
