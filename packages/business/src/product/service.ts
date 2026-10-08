import { type DatabaseClient, db, eq } from "@chatbotx.io/database/client"
import { DefaultJobAction, defaultQueue } from "@chatbotx.io/worker-config"
import {
  productCategoryRepository,
  productRepository,
} from "@chatbotx.io/database/repositories"
import {
  PRODUCT_VECTOR_LOW_RESULT_COUNT,
  deleteProductEmbeddings,
  hashProductEmbeddingContent,
  searchProductEmbeddings,
} from "./embedding"
import {
  productAddonModel,
  productVariantModel,
  productVariantOptionModel,
} from "@chatbotx.io/database/schema"
import type {
  ProductAddonModel,
  ProductModel,
  ProductVariantModel,
  ProductVariantOptionModel,
} from "@chatbotx.io/database/types"
import { createId } from "@chatbotx.io/utils"
import { BaseService } from "../base.service"
import { notFoundException } from "../errors"
import { assertDeletable } from "../template/installed-resource.service"

export type ProductImageInput = {
  id?: string
  mode: "link" | "file"
  url: string
}

export type ProductWriteData = {
  workspaceId: string
  name: string
  shortDescription?: string | null
  longDescription?: string | null
  price?: number
  taxes?: number
  discount?: number
  sku?: string | null
  inventoryPolicy?: "dont_track" | "track"
  inventoryQuantity?: number
  allowOutOfStockPurchase?: boolean
  images?: ProductImageInput[]
  tags?: string[]
  vendor?: string | null
  rank?: number
  categoryId?: string | null
  subcategoryId?: string | null
  isActive?: boolean
  isSearchable?: boolean
  allowSpecialRequest?: boolean
  isAddonOnly?: boolean
}

export type ProductVariantOptionInput = {
  name: string
  values: string[]
  position: number
}

export type ProductVariantInput = {
  combination: Record<string, string>
  price: number
  isEnabled: boolean
}

export type ProductAddonInput = {
  name: string
  maxSelections: number
  addonProductIds: string[]
}

export type ProductFullWriteData = ProductWriteData & {
  variantOptions: ProductVariantOptionInput[]
  variants: ProductVariantInput[]
  addons: ProductAddonInput[]
}

/** The form calls it `mode`; the column stores it as `type`. */
const toImageRows = (images: ProductImageInput[]) =>
  images.map(({ mode, url }) => ({ type: mode, url }))

export type ProductAgentSearchInput = {
  workspaceId: string
  query: string
  categoryId?: string | null
  limit?: number
  embedding?: number[]
}

const PRODUCT_AGENT_DEFAULT_LIMIT = 5
const MIN_PRODUCT_AGENT_SCORE = 8
const TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}]+/u
const COMPACT_ALPHANUMERIC_PATTERN = /[^\p{L}\p{N}]+/gu

function compactSearchText(value: string) {
  return value.toLowerCase().replaceAll(COMPACT_ALPHANUMERIC_PATTERN, "")
}

function tokenizeSearchText(value: string) {
  return value
    .toLowerCase()
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function pushSearchPart(parts: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) {
    parts.push(value.trim())
  }
}

type ProductAgentSearchResult = Awaited<
  ReturnType<typeof productRepository.listForAgentSearch>
>[number]

export function buildProductEmbeddingContent(product: ProductAgentSearchResult) {
  const parts: string[] = []
  pushSearchPart(parts, product.name)
  pushSearchPart(parts, product.sku)
  pushSearchPart(parts, product.shortDescription)
  pushSearchPart(parts, product.longDescription)
  pushSearchPart(parts, product.vendor)
  pushSearchPart(parts, product.category)
  pushSearchPart(parts, product.subcategory)
  for (const tag of product.tags) {
    pushSearchPart(parts, tag)
  }
  for (const option of product.variantOptions) {
    pushSearchPart(parts, option.name)
    for (const value of option.values) {
      pushSearchPart(parts, value)
    }
  }
  for (const variant of product.variants) {
    for (const [name, value] of Object.entries(variant.combination)) {
      pushSearchPart(parts, name)
      pushSearchPart(parts, value)
    }
  }
  for (const addon of product.addons) {
    pushSearchPart(parts, addon.name)
  }
  return parts.join(" ")
}

function boundedEditDistance(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    let rowMinimum = current[0]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      const value = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost,
      )
      current[rightIndex] = value
      rowMinimum = Math.min(rowMinimum, value)
    }
    if (rowMinimum > maxDistance) {
      return maxDistance + 1
    }
    previous = current
  }
  return previous[right.length] ?? maxDistance + 1
}

function fuzzyTextScore(query: string, candidate: string) {
  if (query.length < 4 || candidate.length < 4) {
    return 0
  }
  const maxDistance = query.length <= 6 ? 1 : 2
  const distance = boundedEditDistance(query, candidate, maxDistance)
  if (distance === 0 || distance > maxDistance) {
    return 0
  }
  return maxDistance - distance + 18
}

function scoreProductForAgentSearch(
  query: string,
  product: ProductAgentSearchResult,
) {
  const normalizedQuery = query.toLowerCase().trim()
  const compactQuery = compactSearchText(query)
  const queryTokens = tokenizeSearchText(query)
  const searchText = buildProductEmbeddingContent(product).toLowerCase()
  const compactProductName = compactSearchText(product.name)
  const compactSku = product.sku ? compactSearchText(product.sku) : ""
  const compactSearchTextValue = compactSearchText(searchText)
  const productTokens = tokenizeSearchText(searchText).map(compactSearchText)

  let score = 0
  if (product.name.toLowerCase() === normalizedQuery) {
    score += 100
  }
  if (compactProductName === compactQuery) {
    score += 95
  }
  if (product.name.toLowerCase().includes(normalizedQuery)) {
    score += 70
  }
  if (compactProductName.includes(compactQuery)) {
    score += 65
  }
  if (compactSku && compactSku === compactQuery) {
    score += 90
  }
  if (compactSku && compactSku.includes(compactQuery)) {
    score += 55
  }
  if (compactQuery && compactSearchTextValue.includes(compactQuery)) {
    score += 35
  }
  score += fuzzyTextScore(compactQuery, compactProductName)

  for (const token of queryTokens) {
    const compactToken = compactSearchText(token)
    if (!compactToken) {
      continue
    }
    if (compactProductName === compactToken) {
      score += 35
    } else if (compactProductName.includes(compactToken)) {
      score += 25
    } else if (compactSearchTextValue.includes(compactToken)) {
      score += 10
    } else {
      score += Math.max(
        0,
        ...productTokens.map((productToken) =>
          fuzzyTextScore(compactToken, productToken),
        ),
      )
    }
  }

  const rankBoost = Math.max(0, 10 - Math.min(product.rank, 10))
  return score + rankBoost
}

class ProductService extends BaseService {
  private async enqueueEmbeddingRefresh(input: {
    workspaceId: string
    productIds?: string[]
  }) {
    await defaultQueue.add(DefaultJobAction.refreshProductEmbedding, {
      type: DefaultJobAction.refreshProductEmbedding,
      data: input,
    })
  }

  private async assertReferencesBelongToWorkspace(input: {
    workspaceId: string
    categoryId?: string | null
    subcategoryId?: string | null
    /**
     * The category the sub-category has to sit under. Only a partial update
     * that names a sub-category without repeating its category needs this;
     * everywhere else the incoming `categoryId` is the answer.
     */
    expectedParentId?: string | null
    addons?: ProductAddonInput[]
    tx: DatabaseClient
  }): Promise<void> {
    if (input.categoryId) {
      const category = await productCategoryRepository.find(
        {
          workspaceId: input.workspaceId,
          categoryId: input.categoryId,
        },
        input.tx,
      )
      if (!category) {
        throw notFoundException("Product category does not exist.")
      }
    }

    if (input.subcategoryId) {
      const subcategory = await productCategoryRepository.find(
        {
          workspaceId: input.workspaceId,
          categoryId: input.subcategoryId,
        },
        input.tx,
      )
      // Checking the parentage here, not just existence: a sub-category that
      // belongs to a different category would silently break the filter, which
      // reaches products through whichever of the two columns matches.
      if (!subcategory) {
        throw notFoundException("Product sub-category does not exist.")
      }
      const expectedParentId =
        input.expectedParentId === undefined
          ? (input.categoryId ?? null)
          : input.expectedParentId
      if (subcategory.parentId !== expectedParentId) {
        throw notFoundException(
          "Product sub-category does not belong to the selected category.",
        )
      }
    }

    const addonProductIds = Array.from(
      new Set((input.addons ?? []).flatMap((addon) => addon.addonProductIds)),
    )
    if (addonProductIds.length === 0) {
      return
    }
    const addonProducts = await productRepository.findByIds(
      {
        workspaceId: input.workspaceId,
        productIds: addonProductIds,
      },
      input.tx,
    )
    if (addonProducts.length !== addonProductIds.length) {
      throw notFoundException("One or more addon products do not exist.")
    }
  }

  /**
   * A patch may name a sub-category without repeating the category it sits
   * under. Checking that against `null` would reject a pair that is in fact
   * valid, so the category the product already has stands in for the absent
   * one. `undefined` means the patch answers the question by itself.
   */
  private async resolveExpectedParentId(input: {
    productId: string
    workspaceId: string
    data: Partial<ProductWriteData>
    tx: DatabaseClient
  }): Promise<string | null | undefined> {
    if (input.data.categoryId !== undefined || !input.data.subcategoryId) {
      return
    }
    const current = await productRepository.find(
      { workspaceId: input.workspaceId, productId: input.productId },
      input.tx,
    )
    return current?.categoryId ?? null
  }

  private async insert(
    data: ProductWriteData,
    tx: DatabaseClient,
  ): Promise<ProductModel> {
    const { images = [], ...productData } = data
    const product = await productRepository.create(
      { ...productData, images: toImageRows(images) },
      tx,
    )
    if (!product) {
      throw new Error("Failed to create product")
    }
    return product
  }

  private async applyPatch(input: {
    productId: string
    workspaceId: string
    data: Partial<Omit<ProductWriteData, "workspaceId">>
    tx: DatabaseClient
  }): Promise<void> {
    const { images, ...productData } = input.data
    const updated = await productRepository.update(
      {
        workspaceId: input.workspaceId,
        productId: input.productId,
        // Absent images mean "leave them alone", not "clear them".
        values: {
          ...productData,
          ...(images ? { images: toImageRows(images) } : {}),
        },
      },
      input.tx,
    )
    if (!updated) {
      throw notFoundException("Product does not exist.")
    }
  }

  async create(props: {
    data: ProductWriteData
    tx?: DatabaseClient
  }): Promise<ProductModel> {
    const { data, tx = db } = props
    await this.assertReferencesBelongToWorkspace({
      workspaceId: data.workspaceId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      tx,
    })
    const product = await this.insert(data, tx)
    await this.enqueueEmbeddingRefresh({
      workspaceId: data.workspaceId,
      productIds: [product.id],
    })
    return product
  }

  async createFull(data: ProductFullWriteData): Promise<ProductModel> {
    const { variantOptions, variants, addons, ...productData } = data
    return await db.transaction(async (tx) => {
      // One guard covering categories and addons together, so the row is never
      // inserted before every reference is known to live in this workspace.
      await this.assertReferencesBelongToWorkspace({
        workspaceId: data.workspaceId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        addons,
        tx,
      })
      const product = await this.insert(productData, tx)
      await Promise.all([
        productVariantOptionService.createBulk({
          productId: product.id,
          options: variantOptions,
          tx,
        }),
        productVariantService.createBulk({
          productId: product.id,
          variants,
          tx,
        }),
        productAddonService.createBulk({
          productId: product.id,
          addons,
          tx,
        }),
      ])
      return product
    }).then(async (product) => {
      await this.enqueueEmbeddingRefresh({
        workspaceId: data.workspaceId,
        productIds: [product.id],
      })
      return product
    })
  }

  async update(props: {
    productId: string
    workspaceId: string
    data: Partial<Omit<ProductWriteData, "workspaceId">>
    tx?: DatabaseClient
  }): Promise<void> {
    const { productId, workspaceId, data, tx = db } = props
    await this.assertReferencesBelongToWorkspace({
      workspaceId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      expectedParentId: await this.resolveExpectedParentId({
        productId,
        workspaceId,
        data,
        tx,
      }),
      tx,
    })
    await this.applyPatch({ productId, workspaceId, data, tx })
    await this.enqueueEmbeddingRefresh({ workspaceId, productIds: [productId] })
  }

  async updateFull(
    input: Omit<ProductFullWriteData, "workspaceId"> & {
      workspaceId: string
      productId: string
    },
  ): Promise<void> {
    const {
      productId,
      workspaceId,
      variantOptions,
      variants,
      addons,
      ...data
    } = input
    await db.transaction(async (tx) => {
      await this.assertReferencesBelongToWorkspace({
        workspaceId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        expectedParentId: await this.resolveExpectedParentId({
          productId,
          workspaceId,
          data,
          tx,
        }),
        addons,
        tx,
      })
      await this.applyPatch({ productId, workspaceId, data, tx })
      await Promise.all([
        productVariantOptionService.deleteByProductId({ productId, tx }),
        productVariantService.deleteByProductId({ productId, tx }),
        productAddonService.deleteByProductId({ productId, tx }),
      ])
      await Promise.all([
        productVariantOptionService.createBulk({
          productId,
          options: variantOptions,
          tx,
        }),
        productVariantService.createBulk({ productId, variants, tx }),
        productAddonService.createBulk({ productId, addons, tx }),
      ])
    })
    await this.enqueueEmbeddingRefresh({ workspaceId, productIds: [productId] })
  }

  async delete(input: {
    ids: string[]
    workspaceId: string
    tx?: DatabaseClient
  }): Promise<void> {
    const { ids, workspaceId, tx = db } = input
    await assertDeletable({
      workspaceId,
      resourceKind: "product",
      resourceIds: ids,
    })
    await deleteProductEmbeddings({ workspaceId, productIds: ids }, tx)
    await productRepository.deleteByIds({ workspaceId, productIds: ids }, tx)
  }

  async list(input: Parameters<typeof productRepository.list>[0]) {
    return await productRepository.list(input)
  }

  private async lexicalSearchForAgent(input: ProductAgentSearchInput) {
    const products = await productRepository.listForAgentSearch({
      workspaceId: input.workspaceId,
      categoryId: input.categoryId,
    })

    return products
      .map((product) => ({
        product,
        score: scoreProductForAgentSearch(input.query, product),
      }))
      .filter(({ score }) => score >= MIN_PRODUCT_AGENT_SCORE)
      .sort((left, right) => right.score - left.score)
      .slice(0, input.limit ?? PRODUCT_AGENT_DEFAULT_LIMIT)
      .map(({ product }) => product)
  }

  async searchForAgent(input: ProductAgentSearchInput) {
    const vectorMatches = await searchProductEmbeddings(input)
    const vectorProductIds = vectorMatches.map((match) => match.productId)

    if (vectorProductIds.length > 0) {
      const vectorProducts = await productRepository.listForAgentSearchByIds({
        workspaceId: input.workspaceId,
        productIds: vectorProductIds,
      })
      const productById = new Map(
        vectorProducts.map((product) => [product.id, product]),
      )
      const orderedVectorProducts = vectorProductIds
        .map((productId) => productById.get(productId))
        .filter((product): product is ProductAgentSearchResult => Boolean(product))

      if (orderedVectorProducts.length >= PRODUCT_VECTOR_LOW_RESULT_COUNT) {
        return orderedVectorProducts.slice(
          0,
          input.limit ?? PRODUCT_AGENT_DEFAULT_LIMIT,
        )
      }

      const lexicalProducts = await this.lexicalSearchForAgent(input)
      const merged = [...orderedVectorProducts]
      const seen = new Set(merged.map((product) => product.id))
      for (const product of lexicalProducts) {
        if (!seen.has(product.id)) {
          merged.push(product)
          seen.add(product.id)
        }
      }

      return merged.slice(0, input.limit ?? PRODUCT_AGENT_DEFAULT_LIMIT)
    }

    return await this.lexicalSearchForAgent(input)
  }

  async findById(id: string, workspaceId: string) {
    const product = await productRepository.findDetail({ id, workspaceId })
    if (!product) {
      throw notFoundException("Product does not exist.")
    }
    return product
  }

  async listForEmbeddingRefresh(input: {
    workspaceId: string
    productIds?: string[]
  }) {
    const products = input.productIds?.length
      ? await productRepository.listForAgentSearchByIds({
          workspaceId: input.workspaceId,
          productIds: input.productIds,
        })
      : await productRepository.listForAgentSearch({
          workspaceId: input.workspaceId,
        })

    return products.map((product) => {
      const content = buildProductEmbeddingContent(product)
      return {
        product,
        content,
        contentHash: hashProductEmbeddingContent(content),
      }
    })
  }

  async listFormOptions(workspaceId: string) {
    return await productRepository.listFormOptions({ workspaceId })
  }

  async createFromImport(input: {
    workspaceId: string
    products: Parameters<
      typeof productRepository.createFromImport
    >[0]["products"]
  }) {
    const products = await productRepository.createFromImport(input)
    await this.enqueueEmbeddingRefresh({
      workspaceId: input.workspaceId,
      productIds: products.map((product) => product.id),
    })
    return products
  }

  async listForCatalogSync(
    input: Parameters<typeof productRepository.listForCatalogSync>[0],
  ) {
    return await productRepository.listForCatalogSync(input)
  }
}

class ProductVariantOptionService extends BaseService {
  async createBulk(input: {
    productId: string
    options: ProductVariantOptionInput[]
    tx?: DatabaseClient
  }): Promise<ProductVariantOptionModel[]> {
    const { productId, options, tx = db } = input
    if (options.length === 0) {
      return []
    }
    return await tx
      .insert(productVariantOptionModel)
      .values(
        options.map((option) => ({ id: createId(), productId, ...option })),
      )
      .returning()
  }

  async deleteByProductId(input: {
    productId: string
    tx?: DatabaseClient
  }): Promise<void> {
    const { productId, tx = db } = input
    await tx
      .delete(productVariantOptionModel)
      .where(eq(productVariantOptionModel.productId, productId))
  }
}

class ProductVariantService extends BaseService {
  async createBulk(input: {
    productId: string
    variants: ProductVariantInput[]
    tx?: DatabaseClient
  }): Promise<ProductVariantModel[]> {
    const { productId, variants, tx = db } = input
    if (variants.length === 0) {
      return []
    }
    return await tx
      .insert(productVariantModel)
      .values(
        variants.map((variant) => ({ id: createId(), productId, ...variant })),
      )
      .returning()
  }

  async deleteByProductId(input: {
    productId: string
    tx?: DatabaseClient
  }): Promise<void> {
    const { productId, tx = db } = input
    await tx
      .delete(productVariantModel)
      .where(eq(productVariantModel.productId, productId))
  }
}

class ProductAddonService extends BaseService {
  async createBulk(input: {
    productId: string
    addons: ProductAddonInput[]
    tx?: DatabaseClient
  }): Promise<ProductAddonModel[]> {
    const { productId, addons, tx = db } = input
    if (addons.length === 0) {
      return []
    }
    return await tx
      .insert(productAddonModel)
      .values(addons.map((addon) => ({ id: createId(), productId, ...addon })))
      .returning()
  }

  async deleteByProductId(input: {
    productId: string
    tx?: DatabaseClient
  }): Promise<void> {
    const { productId, tx = db } = input
    await tx
      .delete(productAddonModel)
      .where(eq(productAddonModel.productId, productId))
  }
}

export const productService = new ProductService()
export const productVariantOptionService = new ProductVariantOptionService()
export const productVariantService = new ProductVariantService()
export const productAddonService = new ProductAddonService()
