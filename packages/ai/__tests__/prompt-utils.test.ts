import type { ToolSet } from "ai"
import { describe, expect, test } from "vitest"
import { helpTexts } from "../src/constants"
import {
  AI_AGENT_ACTION_TOOL_PROTOCOL_PROMPT,
  appendAIAgentActionToolProtocol,
  appendKnowledgeBaseGuard,
  appendProductCatalogGuard,
} from "../src/server/prompt-utils"

describe("AI Agent Action tool protocol", () => {
  test("is appended only when persisted action rules are available", () => {
    expect(appendAIAgentActionToolProtocol("base", false)).toBe("base")
    expect(appendAIAgentActionToolProtocol("base", true)).toBe(
      `base\n\n${AI_AGENT_ACTION_TOOL_PROTOCOL_PROMPT}`,
    )
  })

  test("requires the action tool before a customer-facing response", () => {
    expect(AI_AGENT_ACTION_TOOL_PROTOCOL_PROMPT).toContain(
      "MUST call apply_ai_agent_actions",
    )
    expect(AI_AGENT_ACTION_TOOL_PROTOCOL_PROMPT).toContain(
      "not exact keyword matching",
    )
  })
})

describe("product catalog and knowledge base guards", () => {
  test("prioritizes live catalog search when both tools are selected", () => {
    const tools = {
      search_products: {},
      search_knowledge_base: {},
    } as ToolSet

    const catalogPrompt = appendProductCatalogGuard("base", tools)
    const knowledgePrompt = appendKnowledgeBaseGuard("base", tools)

    expect(catalogPrompt).toContain("MUST call search_products")
    expect(catalogPrompt).toContain(
      "source of truth for products, prices, and stock",
    )
    expect(catalogPrompt).toContain(
      "get_product_details only with a product id",
    )
    expect(catalogPrompt).toContain(
      "do not claim that the entire catalog is empty",
    )
    expect(knowledgePrompt).toContain(
      "Use search_knowledge_base for company-specific information not covered by the live product catalog",
    )
    expect(knowledgePrompt).not.toContain(
      "MUST call search_knowledge_base BEFORE answering any question about products",
    )
  })

  test("uses the knowledge base policy when only knowledge search is selected", () => {
    const tools = { search_knowledge_base: {} } as ToolSet

    expect(appendProductCatalogGuard("base", tools)).toBe("base")
    expect(appendKnowledgeBaseGuard("base", tools)).toBe(
      `base\n\n${helpTexts.knowledgeBaseGuard}`,
    )
  })

  test("leaves the prompt unchanged when neither search tool is selected", () => {
    const tools = {} as ToolSet

    expect(appendProductCatalogGuard("base", tools)).toBe("base")
    expect(appendKnowledgeBaseGuard("base", tools)).toBe("base")
  })
})
