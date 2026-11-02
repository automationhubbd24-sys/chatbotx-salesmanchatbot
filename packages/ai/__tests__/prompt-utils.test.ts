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
