import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isConfigurationError: vi.fn(),
  listForEmbeddingRefresh: vi.fn(),
  refreshEmbedding: vi.fn(),
  scheduleEmbeddingRefreshPage: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock("@chatbotx.io/business", () => ({
  isProductEmbeddingConfigurationError: mocks.isConfigurationError,
  productService: {
    listForEmbeddingRefresh: mocks.listForEmbeddingRefresh,
    scheduleEmbeddingRefreshPage: mocks.scheduleEmbeddingRefreshPage,
  },
  refreshProductEmbedding: mocks.refreshEmbedding,
}))

vi.mock("../src/lib/logger", () => ({
  logger: { error: mocks.loggerError, warn: mocks.loggerWarn },
}))

const { refreshProductEmbedding } = await import(
  "../src/default/handlers/refresh-product-embedding"
)

describe("refreshProductEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listForEmbeddingRefresh.mockResolvedValue([
      { product: { id: "product-1" }, content: "Product" },
    ])
    mocks.isConfigurationError.mockReturnValue(false)
  })

  test("schedules the next bounded page after refreshing the current page", async () => {
    await refreshProductEmbedding({
      workspaceId: "workspace-1",
      productIds: ["product-1"],
      nextAfterId: "product-1",
    })

    expect(mocks.scheduleEmbeddingRefreshPage).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      afterId: "product-1",
    })
  })

  test("does not retry a permanent embedding configuration error", async () => {
    const error = new Error("No embedding provider configured")
    mocks.refreshEmbedding.mockRejectedValue(error)
    mocks.isConfigurationError.mockReturnValue(true)

    await expect(
      refreshProductEmbedding({
        workspaceId: "workspace-1",
        productIds: ["product-1"],
      }),
    ).resolves.toBeUndefined()

    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, productId: "product-1" }),
      expect.stringContaining("invalid configuration"),
    )
  })

  test("throws transient errors so BullMQ retries the page", async () => {
    const error = new Error("provider timed out")
    mocks.refreshEmbedding.mockRejectedValue(error)

    await expect(
      refreshProductEmbedding({
        workspaceId: "workspace-1",
        productIds: ["product-1"],
      }),
    ).rejects.toThrow("Product embedding refresh failed for 1 product(s)")

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, productId: "product-1" }),
      expect.stringContaining("refresh failed"),
    )
  })
})
