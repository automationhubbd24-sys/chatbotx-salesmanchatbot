import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  searchForAgent: vi.fn(),
}))

vi.mock("@chatbotx.io/business", () => ({
  productService: {
    findById: (...args: unknown[]) => mocks.findById(...args),
    searchForAgent: (...args: unknown[]) => mocks.searchForAgent(...args),
  },
}))

vi.mock("../src/lib/logger", () => ({
  logger: { error: vi.fn() },
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
  test("search scopes to the workspace and returns safe ranked products", async () => {
    mocks.searchForAgent.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) =>
        product({ id: `product-${index + 1}` }),
      ),
    )

    const result = await createSearchProductsExecutor()(
      { query: "shoes", categoryId: "category-1" },
      context,
    )

    expect(mocks.searchForAgent).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      query: "shoes",
      categoryId: "category-1",
      limit: 5,
    })
    expect(result).toMatchObject({
      products: Array.from({ length: 5 }, (_, index) => ({
        id: `product-${index + 1}`,
        available: false,
      })),
    })
  })

  test.each([
    ["inactive", { isActive: false }],
    ["unsearchable", { isSearchable: false }],
  ])("detail rejects %s products", async (_name, overrides) => {
    mocks.findById.mockResolvedValue(product(overrides))

    await expect(
      createGetProductDetailsExecutor()({ productId: "product-1" }, context),
    ).resolves.toEqual({ product: null })
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
  })
})
