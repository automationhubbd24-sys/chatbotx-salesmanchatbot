import { describe, expect, test, vi } from "vitest"
import { systemFunctionNames } from "../src/constants"
import { getAISystemTools } from "../src/server/tools/system-functions"

describe("e-commerce system functions", () => {
  test("selects catalog tools, validates trimmed search input, and dispatches executors", async () => {
    const searchProducts = vi.fn().mockResolvedValue({
      products: [{ id: "product-1", name: "Shoe" }],
    })
    const getProductDetails = vi.fn().mockResolvedValue({
      product: { id: "product-1", name: "Shoe" },
    })
    const context = {
      workspaceId: "workspace-1",
      conversationId: "conversation-1",
      contactId: "contact-1",
    }
    const tools = getAISystemTools({
      selectedSystemIds: [
        systemFunctionNames.searchProducts,
        systemFunctionNames.getProductDetails,
      ],
      systemFunctionContextGetter: vi.fn().mockResolvedValue(context),
      systemToolExecutors: {
        [systemFunctionNames.searchProducts]: searchProducts,
        [systemFunctionNames.getProductDetails]: getProductDetails,
      },
    })

    expect(Object.keys(tools)).toEqual([
      systemFunctionNames.searchProducts,
      systemFunctionNames.getProductDetails,
    ])

    const searchTool = tools[systemFunctionNames.searchProducts] as {
      execute: (input: unknown) => Promise<unknown>
      inputSchema: { parse: (input: unknown) => unknown }
    }
    const detailsTool = tools[systemFunctionNames.getProductDetails] as {
      execute: (input: unknown) => Promise<unknown>
    }

    expect(searchTool.inputSchema.parse({ query: "  shoes  " })).toEqual({
      query: "shoes",
    })
    expect(() => searchTool.inputSchema.parse({ query: "   " })).toThrow()
    await expect(searchTool.execute({ query: "shoes" })).resolves.toEqual({
      products: [{ id: "product-1", name: "Shoe" }],
    })
    await expect(
      detailsTool.execute({ productId: "product-1" }),
    ).resolves.toEqual({
      product: { id: "product-1", name: "Shoe" },
    })

    expect(searchProducts).toHaveBeenCalledWith({ query: "shoes" }, context)
    expect(getProductDetails).toHaveBeenCalledWith(
      { productId: "product-1" },
      context,
    )
  })
})
