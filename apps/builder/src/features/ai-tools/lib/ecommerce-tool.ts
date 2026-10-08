import { systemFunctionNames } from "@chatbotx.io/ai"

export const ecommerceToolValue = "sys:ecommerce"

const ecommerceSystemToolValues = [
  `sys:${systemFunctionNames.searchProducts}`,
  `sys:${systemFunctionNames.getProductDetails}`,
]

export function collapseEcommerceToolsForForm(tools: string[]): string[] {
  const selected = new Set(tools)
  const hasAnyEcommerceTool = ecommerceSystemToolValues.some((tool) =>
    selected.has(tool),
  )

  if (!hasAnyEcommerceTool) {
    return tools
  }

  return [
    ...tools.filter((tool) => !ecommerceSystemToolValues.includes(tool)),
    ecommerceToolValue,
  ]
}

export function expandEcommerceToolsForSave(tools: string[]): string[] {
  const selected = new Set(tools)
  if (!selected.has(ecommerceToolValue)) {
    return tools
  }

  selected.delete(ecommerceToolValue)
  for (const tool of ecommerceSystemToolValues) {
    selected.add(tool)
  }

  return [...selected]
}

export function isProductSystemTool(toolId: string): boolean {
  return ecommerceSystemToolValues.includes(`sys:${toolId}`)
}
