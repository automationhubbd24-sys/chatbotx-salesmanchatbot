import { describe, expect, test } from "vitest"
import { helpTexts } from "../src/constants"

describe("knowledge base prompt policy", () => {
  test("describes file search as generic uploaded workspace knowledge", () => {
    expect(helpTexts.fileSearchDescription).toContain(
      "uploaded knowledge files",
    )
    expect(helpTexts.fileSearchDescription).toContain("private")
    expect(helpTexts.fileSearchDescription).toContain("domain-specific")
    expect(helpTexts.fileSearchDescription).not.toContain(
      "products, policies, and company details",
    )
  })

  test("knowledge base guard covers when to call search_knowledge_base", () => {
    expect(helpTexts.knowledgeBaseGuard).toContain("search_knowledge_base")
    expect(helpTexts.knowledgeBaseGuard).toContain("products")
    expect(helpTexts.knowledgeBaseGuard).toContain("company-specific details")
  })

  test("keeps live catalog facts out of knowledge-base authority", () => {
    expect(helpTexts.knowledgeBaseGuard).toContain("search_products")
    expect(helpTexts.knowledgeBaseGuard).toContain("current price")
    expect(helpTexts.knowledgeBaseGuard).toContain("not authoritative")
  })

  test("catalog freshness policy requires live product search", () => {
    expect(helpTexts.catalogFreshnessGuard).toContain("search_products")
    expect(helpTexts.catalogFreshnessGuard).toContain("availability")
    expect(helpTexts.catalogFreshnessGuard).toContain("current price")
    expect(helpTexts.catalogFreshnessGuard).toContain("get_product_details")
  })

  test("prevents knowledge-base use for conversational non-search cases", () => {
    expect(helpTexts.knowledgeBaseGuard).toContain("greetings")
    expect(helpTexts.knowledgeBaseGuard).toContain("small talk")
    expect(helpTexts.knowledgeBaseGuard).toContain("simple clarification")
  })

  test("fabrication guard forbids inventing data or image URLs", () => {
    expect(helpTexts.fabricationGuard).toContain("Never fabricate")
    expect(helpTexts.fabricationGuard).toContain("image URLs")
    expect(helpTexts.fabricationGuard).toContain(
      "appear exactly in tool results",
    )
  })

  test("fabrication guard covers the no-results fallback case", () => {
    expect(helpTexts.fabricationGuard).toContain("tool returns no results")
    expect(helpTexts.fabricationGuard).toContain(
      "tell the user you could not find the information",
    )
  })
})
