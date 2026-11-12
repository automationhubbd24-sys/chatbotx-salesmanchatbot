import type { ToolSet } from "ai"
import { describe, expect, test } from "vitest"
import { helpTexts, systemFunctionNames } from "../src/constants"
import {
  AI_AGENT_ACTION_TOOL_PROTOCOL_PROMPT,
  appendAIAgentActionToolProtocol,
  appendCatalogFreshnessGuard,
} from "../src/server/prompt-utils"

describe("catalog freshness guard", () => {
  test("is unchanged without search_products and appended when it is available", () => {
    expect(appendCatalogFreshnessGuard("base", {} as ToolSet)).toBe("base")

    const tools = {
      [systemFunctionNames.searchProducts]: {},
    } as ToolSet
    expect(appendCatalogFreshnessGuard("base", tools)).toBe(
      `base\n\n${helpTexts.catalogFreshnessGuard}`,
    )
  })

  test("grounds live product facts in only the latest search result", () => {
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "ONLY the most recent search_products result",
    )
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "not returned by that result",
    )
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "prior assistant responses",
    )
    expect(helpTexts.catalogFreshnessGuard).toContain("knowledge-base/RAG")
  })

  test("requires a no-matches response rather than historic products", () => {
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "no matching available products were found",
    )
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "Do not offer products from conversation history or RAG results",
    )
    expect(helpTexts.catalogFreshnessGuard).toContain(
      "available status is authoritative",
    )
  })
})

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
