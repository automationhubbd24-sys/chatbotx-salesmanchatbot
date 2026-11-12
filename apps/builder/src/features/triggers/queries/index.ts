import { triggerService } from "@salesmanchatbot.io/business"
import type { TriggerModel } from "@salesmanchatbot.io/database/types"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"
import type { GetTriggersSchema, ListTriggersResponse } from "../schema/query"

export async function getTriggers(
  input: GetTriggersSchema,
): Promise<ListTriggersResponse> {
  await assertCurrentUserCanAccessChatbot(input.workspaceId)

  return await triggerService.list(input)
}

export async function findTrigger(params: {
  id?: string
  workspaceId?: string
}): Promise<TriggerModel | null> {
  if (!(params.id || params.workspaceId)) {
    return null
  }

  return await triggerService.findWithConditions(params)
}
