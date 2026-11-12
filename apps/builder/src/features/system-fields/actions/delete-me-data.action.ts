"use server"

import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { systemFieldService } from "@salesmanchatbot.io/business/system-field"
import { actionClient } from "@/lib/safe-action"
import { loadServableWorkspace } from "@/lib/workspace/load-servable-workspace"
import {
  type MeLinkInput,
  meLinkInputSchema,
  toMePrivacyParams,
} from "../lib/me-link-params"

export const deleteMeDataAction = actionClient
  .inputSchema(meLinkInputSchema)
  .action(handleDeleteMeData)

export async function handleDeleteMeData({
  parsedInput,
}: {
  parsedInput: MeLinkInput
}) {
  const { servable } = await loadServableWorkspace(parsedInput.w)
  if (!servable) {
    throw new salesmanChatbotException(
      "workspaceScheduledDeletion",
      "workspaceScheduledDeletion",
      403,
    )
  }

  await systemFieldService.deleteMeData(toMePrivacyParams(parsedInput))
  return null
}
