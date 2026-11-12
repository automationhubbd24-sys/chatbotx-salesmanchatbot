import { describe, expect, test } from "vitest"
import {
  orderSystemFunctionIds,
  systemFunctionGroupIds,
  systemFunctionNames,
} from "../src/constants"
import { expandSystemToolIds } from "../src/server/toolset"

describe("expandSystemToolIds", () => {
  test("expands the order aggregate into all eight order tools", () => {
    expect(expandSystemToolIds([systemFunctionGroupIds.orderTools])).toEqual(
      orderSystemFunctionIds,
    )
    expect(orderSystemFunctionIds).toHaveLength(8)
  })

  test("retains direct legacy order selections", () => {
    expect(
      expandSystemToolIds([
        systemFunctionNames.startOrderIntake,
        systemFunctionNames.getOrderDetails,
      ]),
    ).toEqual([
      systemFunctionNames.startOrderIntake,
      systemFunctionNames.getOrderDetails,
    ])
  })

  test("deduplicates expanded tools and preserves non-order selections", () => {
    expect(
      expandSystemToolIds([
        systemFunctionNames.searchProducts,
        systemFunctionGroupIds.orderTools,
        systemFunctionNames.startOrderIntake,
        systemFunctionNames.searchProducts,
        systemFunctionNames.webSearch,
      ]),
    ).toEqual([
      systemFunctionNames.searchProducts,
      ...orderSystemFunctionIds,
      systemFunctionNames.webSearch,
    ])
  })
})
