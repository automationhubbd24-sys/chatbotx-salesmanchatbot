import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  categoryFind: vi.fn(),
  productCreate: vi.fn(),
  productDeleteByIds: vi.fn(),
  productFind: vi.fn(),
  productUpdate: vi.fn(),
  findProductsByIds: vi.fn(),
  listForAgentSearch: vi.fn(),
  listForAgentSearchPage: vi.fn(),
  listForAgentSearchByIds: vi.fn(),
  embeddingDeleteByProductIds: vi.fn(),
  queueAdd: vi.fn(),
  createProductQueryEmbedding: vi.fn(),
  searchProductEmbeddings: vi.fn(),
  transaction: vi.fn(),
  deleteRow: vi.fn(),
  insert: vi.fn(),
  templateInstalledResourceFindMany: vi.fn(async () => []),
}))

/** Stands in for the transaction handle; every write is mocked at the repository. */
const tx = {
  delete: mocks.deleteRow,
  insert: mocks.insert,
}

vi.mock("@chatbotx.io/database/client", () => ({
  db: {
    transaction: mocks.transaction,
    query: {
      templateInstalledResourceModel: {
        findMany: mocks.templateInstalledResourceFindMany,
      },
    },
  },
  eq: (column: unknown, value: unknown) => ({ column, value }),
}))

vi.mock("@chatbotx.io/database/repositories", () => ({
  productCategoryRepository: {
    find: (...args: unknown[]) => mocks.categoryFind(...args),
  },
  productRepository: {
    create: (...args: unknown[]) => mocks.productCreate(...args),
    deleteByIds: (...args: unknown[]) => mocks.productDeleteByIds(...args),
    find: (...args: unknown[]) => mocks.productFind(...args),
    findByIds: (...args: unknown[]) => mocks.findProductsByIds(...args),
    listForAgentSearch: (...args: unknown[]) =>
      mocks.listForAgentSearch(...args),
    listForAgentSearchPage: (...args: unknown[]) =>
      mocks.listForAgentSearchPage(...args),
    listForAgentSearchByIds: (...args: unknown[]) =>
      mocks.listForAgentSearchByIds(...args),
    update: (...args: unknown[]) => mocks.productUpdate(...args),
  },
}))

vi.mock("@chatbotx.io/worker-config", () => ({
  DefaultJobAction: { refreshProductEmbedding: "refreshProductEmbedding" },
  defaultQueue: { add: mocks.queueAdd },
}))

vi.mock("../src/product/embedding", () => ({
  createProductQueryEmbedding: mocks.createProductQueryEmbedding,
  deleteProductEmbeddings: mocks.embeddingDeleteByProductIds,
  PRODUCT_VECTOR_LOW_RESULT_COUNT: 3,
  searchProductEmbeddings: mocks.searchProductEmbeddings,
}))

vi.mock("@chatbotx.io/database/schema", () => ({
  productAddonModel: { productId: "addon-product-id" },
  productVariantModel: { productId: "variant-product-id" },
  productVariantOptionModel: { productId: "option-product-id" },
}))

vi.mock("@chatbotx.io/redis", () => ({
  invalidateCacheByTags: vi.fn(),
}))

const { productService } = await import("../src/product/service")

const fullUpdate = {
  workspaceId: "workspace-1",
  productId: "product-1",
  name: "Product",
  variantOptions: [],
  variants: [],
  addons: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.categoryFind.mockResolvedValue({ id: "category-1", parentId: null })
  mocks.findProductsByIds.mockResolvedValue([])
  mocks.productCreate.mockResolvedValue({ id: "product-1" })
  mocks.productUpdate.mockResolvedValue({ id: "product-1" })
  mocks.productFind.mockResolvedValue({
    id: "product-1",
    categoryId: "category-1",
  })
  mocks.listForAgentSearch.mockResolvedValue([])
  mocks.listForAgentSearchPage.mockResolvedValue([])
  mocks.listForAgentSearchByIds.mockResolvedValue([])
  mocks.createProductQueryEmbedding.mockResolvedValue(undefined)
  mocks.searchProductEmbeddings.mockResolvedValue([])
  mocks.transaction.mockImplementation(
    async (run: (client: typeof tx) => unknown) => await run(tx),
  )
})

describe("productService workspace boundaries", () => {
  test("rejects a category that does not belong to the product workspace", async () => {
    mocks.categoryFind.mockResolvedValue(undefined)

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-from-another-workspace" },
      }),
    ).rejects.toThrow("Product category does not exist")

    expect(mocks.productUpdate).not.toHaveBeenCalled()
    expect(mocks.categoryFind).toHaveBeenCalledWith(
      {
        workspaceId: "workspace-1",
        categoryId: "category-from-another-workspace",
      },
      expect.anything(),
    )
  })

  test("stops before replacing child rows when the product is outside the workspace", async () => {
    mocks.productUpdate.mockResolvedValue(undefined)

    await expect(productService.updateFull(fullUpdate)).rejects.toThrow(
      "Product does not exist",
    )

    expect(mocks.deleteRow).not.toHaveBeenCalled()
  })

  test("updates a product after workspace-scoped references are validated", async () => {
    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-1" },
      }),
    ).resolves.toBeUndefined()

    expect(mocks.productUpdate).toHaveBeenCalledOnce()
  })

  test("scopes a delete to the workspace that asked for it", async () => {
    await productService.delete({
      ids: ["product-1", "product-2"],
      workspaceId: "workspace-1",
    })

    expect(mocks.productDeleteByIds).toHaveBeenCalledWith(
      { workspaceId: "workspace-1", productIds: ["product-1", "product-2"] },
      expect.anything(),
    )
  })
})

describe("productService sub-category parentage", () => {
  /** Resolves category ids to rows, so a test can describe a whole tree at once. */
  const givenCategories = (rows: Record<string, { parentId: string | null }>) =>
    mocks.categoryFind.mockImplementation((input: { categoryId: string }) =>
      rows[input.categoryId]
        ? { id: input.categoryId, ...rows[input.categoryId] }
        : undefined,
    )

  test("rejects a sub-category that does not exist in the workspace", async () => {
    givenCategories({ "category-1": { parentId: null } })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-1", subcategoryId: "ghost" },
      }),
    ).rejects.toThrow("Product sub-category does not exist")

    expect(mocks.productUpdate).not.toHaveBeenCalled()
  })

  test("rejects a sub-category filed under a different category", async () => {
    givenCategories({
      "category-1": { parentId: null },
      "sub-of-other": { parentId: "category-2" },
    })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-1", subcategoryId: "sub-of-other" },
      }),
    ).rejects.toThrow("does not belong to the selected category")

    expect(mocks.productUpdate).not.toHaveBeenCalled()
  })

  test("accepts a sub-category filed under the selected category", async () => {
    givenCategories({
      "category-1": { parentId: null },
      "sub-1": { parentId: "category-1" },
    })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-1", subcategoryId: "sub-1" },
      }),
    ).resolves.toBeUndefined()

    expect(mocks.productUpdate).toHaveBeenCalledOnce()
  })

  test("rejects a top-level category used as a sub-category", async () => {
    givenCategories({
      "category-1": { parentId: null },
      "category-2": { parentId: null },
    })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { categoryId: "category-1", subcategoryId: "category-2" },
      }),
    ).rejects.toThrow("does not belong to the selected category")
  })

  test("falls back to the stored category when a patch omits it", async () => {
    givenCategories({ "sub-1": { parentId: "category-1" } })
    mocks.productFind.mockResolvedValue({
      id: "product-1",
      categoryId: "category-1",
    })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { subcategoryId: "sub-1" },
      }),
    ).resolves.toBeUndefined()

    expect(mocks.productFind).toHaveBeenCalledWith(
      { workspaceId: "workspace-1", productId: "product-1" },
      expect.anything(),
    )
    expect(mocks.productUpdate).toHaveBeenCalledOnce()
  })

  test("still rejects when the stored category is not the sub-category's parent", async () => {
    givenCategories({ "sub-1": { parentId: "category-1" } })
    mocks.productFind.mockResolvedValue({
      id: "product-1",
      categoryId: "category-9",
    })

    await expect(
      productService.update({
        workspaceId: "workspace-1",
        productId: "product-1",
        data: { subcategoryId: "sub-1" },
      }),
    ).rejects.toThrow("does not belong to the selected category")
  })

  test("does not read the product when the patch touches no sub-category", async () => {
    await productService.update({
      workspaceId: "workspace-1",
      productId: "product-1",
      data: { name: "Renamed" },
    })

    expect(mocks.productFind).not.toHaveBeenCalled()
  })
})

const agentProduct = (id: string, name: string) => ({
  id,
  name,
  sku: null,
  shortDescription: null,
  longDescription: null,
  vendor: null,
  category: null,
  subcategory: null,
  tags: [],
  variantOptions: [],
  variants: [],
  addons: [],
  rank: 0,
})

describe("productService semantic agent search", () => {
  test("preserves vector similarity ordering after product hydration", async () => {
    const first = agentProduct("product-1", "First")
    const second = agentProduct("product-2", "Second")
    mocks.listForAgentSearch.mockResolvedValue([first, second])
    mocks.createProductQueryEmbedding.mockResolvedValue({
      embedding: Array.from({ length: 3072 }, () => 0),
      model: "openai:text-embedding-3-large",
    })
    mocks.searchProductEmbeddings.mockResolvedValue([
      { productId: "product-2", distance: 0.1 },
      { productId: "product-1", distance: 0.2 },
    ])
    mocks.listForAgentSearchByIds.mockResolvedValue([first, second])

    const results = await productService.searchForAgent({
      workspaceId: "workspace-1",
      query: "first second",
    })

    expect(results.map((product) => product.id)).toEqual([
      "product-2",
      "product-1",
    ])
  })

  test("merges lexical results without duplicates when vector results are sparse", async () => {
    const vector = agentProduct("product-1", "Blue Shirt")
    const lexical = agentProduct("product-2", "Blue Hat")
    mocks.listForAgentSearch.mockResolvedValue([vector, lexical])
    mocks.createProductQueryEmbedding.mockResolvedValue({
      embedding: Array.from({ length: 3072 }, () => 0),
      model: "openai:text-embedding-3-large",
    })
    mocks.searchProductEmbeddings.mockResolvedValue([
      { productId: "product-1", distance: 0.1 },
    ])
    mocks.listForAgentSearchByIds.mockResolvedValue([vector])

    const results = await productService.searchForAgent({
      workspaceId: "workspace-1",
      query: "blue",
    })

    expect(results.map((product) => product.id)).toEqual([
      "product-1",
      "product-2",
    ])
  })

  test("returns lexical results when embedding resolution fails", async () => {
    const product = agentProduct("product-1", "Blue Shirt")
    mocks.listForAgentSearch.mockResolvedValue([product])
    mocks.createProductQueryEmbedding.mockRejectedValue(
      new Error("provider failed"),
    )

    await expect(
      productService.searchForAgent({
        workspaceId: "workspace-1",
        query: "blue",
      }),
    ).resolves.toEqual([product])
    expect(mocks.searchProductEmbeddings).not.toHaveBeenCalled()
  })

  test("uses lexical results when no dimension-safe query embedding is available", async () => {
    const product = agentProduct("product-1", "Blue Shirt")
    mocks.listForAgentSearch.mockResolvedValue([product])
    mocks.createProductQueryEmbedding.mockResolvedValue(undefined)

    await expect(
      productService.searchForAgent({
        workspaceId: "workspace-1",
        query: "blue",
      }),
    ).resolves.toEqual([product])
    expect(mocks.searchProductEmbeddings).not.toHaveBeenCalled()
  })
})

describe("productService write shaping", () => {
  test("enqueues every sequential update for embedding refresh", async () => {
    await productService.update({
      workspaceId: "workspace-1",
      productId: "product-1",
      data: { name: "First rename" },
    })
    await productService.update({
      workspaceId: "workspace-1",
      productId: "product-1",
      data: { name: "Second rename" },
    })

    expect(mocks.queueAdd).toHaveBeenCalledTimes(2)
    for (const [, , options] of mocks.queueAdd.mock.calls) {
      expect(options).toMatchObject({ attempts: 3, removeOnComplete: true })
      expect(options).not.toHaveProperty("jobId")
    }
  })

  test("schedules one bounded catalog page with a continuation cursor", async () => {
    mocks.listForAgentSearchPage.mockResolvedValue([
      { id: "product-1" },
      { id: "product-2" },
    ])

    await expect(
      productService.scheduleEmbeddingRefreshPage({
        workspaceId: "workspace-1",
      }),
    ).resolves.toEqual({ scheduled: 2, nextAfterId: "product-2" })

    expect(mocks.listForAgentSearchPage).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      limit: 50,
    })
    expect(mocks.queueAdd).toHaveBeenCalledWith(
      "refreshProductEmbedding",
      expect.objectContaining({
        data: {
          workspaceId: "workspace-1",
          productIds: ["product-1", "product-2"],
          nextAfterId: "product-2",
        },
      }),
      expect.objectContaining({ attempts: 3, removeOnComplete: true }),
    )
  })

  test("stores the form's image mode as the column's type", async () => {
    await productService.create({
      data: {
        workspaceId: "workspace-1",
        name: "Product",
        images: [{ mode: "link", url: "https://example.com/a.png" }],
      },
    })

    expect(mocks.productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [{ type: "link", url: "https://example.com/a.png" }],
      }),
      expect.anything(),
    )
  })

  test("leaves images alone when a patch does not mention them", async () => {
    await productService.update({
      workspaceId: "workspace-1",
      productId: "product-1",
      data: { name: "Renamed" },
    })

    const [{ values }] = mocks.productUpdate.mock.calls[0] as [
      { values: Record<string, unknown> },
    ]
    expect(values).not.toHaveProperty("images")
    expect(values).toMatchObject({ name: "Renamed" })
  })

  test("validates references once before inserting the full product", async () => {
    await productService.createFull({
      workspaceId: "workspace-1",
      name: "Product",
      categoryId: "category-1",
      variantOptions: [],
      variants: [],
      addons: [],
    })

    expect(mocks.categoryFind).toHaveBeenCalledOnce()
    expect(mocks.productCreate).toHaveBeenCalledOnce()
  })

  test("rejects an addon product from another workspace before inserting", async () => {
    mocks.findProductsByIds.mockResolvedValue([])

    await expect(
      productService.createFull({
        workspaceId: "workspace-1",
        name: "Product",
        variantOptions: [],
        variants: [],
        addons: [
          { name: "Extras", maxSelections: 1, addonProductIds: ["foreign"] },
        ],
      }),
    ).rejects.toThrow("addon products do not exist")

    expect(mocks.productCreate).not.toHaveBeenCalled()
  })
})
