import type { FlowNode } from "@salesmanchatbot.io/flow-config"
import type { NodeChange } from "@xyflow/react"

export const hasMeaningfulNodeChange = (changes: NodeChange<FlowNode>[]) =>
  changes.some((change) => change.type === "add" || change.type === "remove")
