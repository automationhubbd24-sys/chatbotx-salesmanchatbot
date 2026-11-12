import {
  type ListSelectableResourcesResult,
  templateService,
} from "@salesmanchatbot.io/business"
import type { TemplateCategory } from "@salesmanchatbot.io/database/partials"

export type {
  ListSelectableResourcesResult,
  SelectableResourceItem,
} from "@salesmanchatbot.io/business"

export const listSelectableResources = async (input: {
  workspaceId: string
  category: TemplateCategory
  keyword?: string | null
  cursor?: string | null
  limit?: number | null
}): Promise<ListSelectableResourcesResult> =>
  await templateService.listSelectableResources(input)
