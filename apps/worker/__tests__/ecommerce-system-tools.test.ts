import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  list: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@chatbotx.io/business", () => ({
  productService: {
    findById: (...args: unknown[]) => mocks.findById(...args),
    list: (...args: unknown[]) => mocks.list(...args),
  },
}))

vi.mock("../src/lib/logger", () => ({
  logger: { error: mocks.error, info: mocks.info },
}))

const { createGetProductDetailsExecutor, createSearchProductsExecutor } =
  await import(
    "../src/integration/handlers/automated-response/system-tools/ecommerce"
  )

const context = {
  workspaceId: "workspace-1",
  conversationId: "conversation-1",
  contactId: "contact-1",
}

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "product-1",
  name: "Shoe",
  shortDescription: "Comfortable shoe",
  price: 50,
  taxes: 5,
  discount: 10,
  currency: "USD",
  productUrl: "https://store.example/products/shoe",
  sku: "SHOE-1",
  inventoryPolicy: "track" as const,
  inventoryQuantity: 0,
  allowOutOfStockPurchase: false,
  images: [{ url: "https://store.example/shoe.png", type: "link" as const }],
  category: "Shoes",
  subcategory: "Running",
  tags: ["sport"],
  vendor: "Acme",
  isActive: true,
  isSearchable: true,
  variantOptions: [{ name: "Size", values: ["M"], position: 1 }],
  variants: [
    { id: "variant-1", combination: { Size: "M" }, price: 50, isEnabled: true },
  ],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("e-commerce system tools", () => {
  test("reply diagnostics compare configured tools and summarize calls without action rules", () => {
    // The reply module also wires providers, queues and streaming; check its
    // registration here while exercising the product executors below at runtime.
    const source = readFileSync(
      "src/integration/handlers/automated-response/replies.ts",
      "utf8",
    )
    expect(source).toContain("selectedToolIds: aiAgent.tools")
    expect(source).toContain("availableToolNames: Object.keys(tools)")
    const summary = source.slice(
      source.indexOf("const logActionToolSelection ="),
      source.indexOf(
        "if (richModeEnabled) {",
        source.indexOf("const logActionToolSelection ="),
      ),
    )
    expect(summary).toContain("agentId: aiAgent.id")
    expect(summary).toContain("...toolStats")
    expect(summary).toContain("[automated-response] tool execution summary")
    expect(summary).not.toContain("if (!toolStats.actionToolAvailable)")
  })

  test("search scopes to the workspace, filters unsafe products, and caps results", async () => {
    mocks.list.mockResolvedValue({
      data: [
        product({ id: "inactive", isActive: false }),
        product({ id: "hidden", isSearchable: false }),
        ...Array.from({ length: 6 }, (_, index) =>
          product({ id: `product-${index + 1}` }),
        ),
      ],
    })

    const result = await createSearchProductsExecutor()(
      { query: "shoes", categoryId: "category-1" },
      context,
    )

    expect(mocks.list).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      name: "shoes",
      categoryId: "category-1",
      page: 1,
      perPage: 20,
    })
    expect(mocks.info).toHaveBeenLastCalledWith(
      {
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        query: "shoes",
        queryTruncated: false,
        categoryId: "category-1",
        fetchedCount: 8,
        eligibleCount: 6,
        returnedCount: 5,
        outcome: "found",
      },
      "[ecommerce] product search completed",
    )
    expect(result).toMatchObject({
      products: Array.from({ length: 5 }, (_, index) => ({
        id: `product-${index + 1}`,
        available: false,
      })),
    })
  })

  test("correlates concurrent product tools without logging product payloads", async () => {
    mocks.list.mockResolvedValue({ data: [product()] })
    mocks.findById.mockResolvedValue(product())
    const correlation = { agentId: "agent-1", triggerMessageId: "message-1" }
    const otherCorrelation = {
      agentId: "agent-2",
      triggerMessageId: "message-2",
    }
    await Promise.all([
      createSearchProductsExecutor(correlation)({ query: "shoes" }, context),
      createGetProductDetailsExecutor(otherCorrelation)(
        { productId: "product-1" },
        { ...context, conversationId: "conversation-2" },
      ),
    ])
    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        ...correlation,
        conversationId: "conversation-1",
        outcome: "found",
      }),
      "[ecommerce] product search completed",
    )
    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        ...otherCorrelation,
        conversationId: "conversation-2",
        outcome: "found",
      }),
      "[ecommerce] product details completed",
    )
    for (const [fields] of mocks.info.mock.calls) {
      expect(fields).not.toHaveProperty("products")
      expect(fields).not.toHaveProperty("product")
      expect(fields).not.toHaveProperty("contactId")
      expect(JSON.stringify(fields)).not.toContain("Comfortable shoe")
    }
  })

  test("bounds diagnostic queries without changing the search input", async () => {
    mocks.list.mockResolvedValue({ data: [] })
    const query = "s".repeat(150)
    await createSearchProductsExecutor()({ query }, context)
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ name: query }),
    )
    expect(mocks.info).toHaveBeenLastCalledWith(
      {
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        query: "s".repeat(120),
        queryTruncated: true,
        categoryId: undefined,
        fetchedCount: 0,
        eligibleCount: 0,
        returnedCount: 0,
        outcome: "empty",
      },
      "[ecommerce] product search completed",
    )
  })

  test("logs missing context without querying products", async () => {
    await expect(
      createSearchProductsExecutor()({ query: "shoes" }),
    ).resolves.toEqual({ products: [] })
    await expect(
      createGetProductDetailsExecutor()({ productId: "product-1" }),
    ).resolves.toEqual({ product: null })
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.findById).not.toHaveBeenCalled()
    expect(mocks.info).toHaveBeenCalledWith(
      { reason: "missing_context" },
      "[ecommerce] product search skipped",
    )
    expect(mocks.info).toHaveBeenCalledWith(
      { reason: "missing_context", productId: "product-1" },
      "[ecommerce] product details skipped",
    )
  })

  test("logs scoped search errors under err without product results", async () => {
    mocks.list.mockRejectedValueOnce(new Error("unavailable"))
    await expect(
      createSearchProductsExecutor()({ query: "shoes" }, context),
    ).resolves.toEqual({ products: [] })
    expect(mocks.error).toHaveBeenCalledWith(
      {
        err: expect.objectContaining({ message: "unavailable" }),
        query: "shoes",
        queryTruncated: false,
        categoryId: undefined,
        outcome: "error",
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
      },
      "[ecommerce] product search tool execution failed",
    )
    expect(mocks.info).toHaveBeenCalledTimes(1)
  })

  test.each([
    ["inactive", { isActive: false }],
    ["unsearchable", { isSearchable: false }],
  ])("detail rejects %s products", async (_name, overrides) => {
    mocks.findById.mockResolvedValue(product(overrides))

    await expect(
      createGetProductDetailsExecutor()({ productId: "product-1" }, context),
    ).resolves.toEqual({ product: null })
    expect(mocks.info).toHaveBeenLastCalledWith(
      {
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        productId: "product-1",
        fetchedCount: 1,
        outcome: "ineligible",
        eligibleCount: 0,
        returnedCount: 0,
      },
      "[ecommerce] product details completed",
    )
  })

  test("detail returns safe fields and treats not found as unavailable", async () => {
    mocks.findById
      .mockResolvedValueOnce(product())
      .mockRejectedValueOnce(new Error("missing"))
    const executor = createGetProductDetailsExecutor()

    await expect(
      executor({ productId: "product-1" }, context),
    ).resolves.toEqual({
      product: expect.objectContaining({
        id: "product-1",
        available: false,
        imageUrl: "https://store.example/shoe.png",
        options: [{ name: "Size", values: ["M"], position: 1 }],
        variants: [
          {
            id: "variant-1",
            combination: { Size: "M" },
            price: 50,
            isEnabled: true,
          },
        ],
      }),
    })
    await expect(executor({ productId: "missing" }, context)).resolves.toEqual({
      product: null,
    })
    expect(mocks.findById).toHaveBeenNthCalledWith(
      1,
      "product-1",
      "workspace-1",
    )
    expect(mocks.findById).toHaveBeenNthCalledWith(2, "missing", "workspace-1")
    expect(mocks.info).toHaveBeenLastCalledWith(
      {
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        productId: "product-1",
        fetchedCount: 1,
        outcome: "found",
        eligibleCount: 1,
        returnedCount: 1,
      },
      "[ecommerce] product details completed",
    )
    expect(mocks.error).toHaveBeenCalledWith(
      {
        err: expect.objectContaining({ message: "missing" }),
        outcome: "error",
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        productId: "missing",
      },
      "[ecommerce] product details tool execution failed",
    )
  })
})
