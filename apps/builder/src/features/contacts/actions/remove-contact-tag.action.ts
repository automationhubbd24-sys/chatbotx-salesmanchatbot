"use server"
import { tagService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { requireContactPermissionScope } from "../permissions"
import { removeContactTagsRequest } from "../schema/contact-tag"

export const removeContactTagAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString()])
  .inputSchema(removeContactTagsRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    const accessScope = await requireContactPermissionScope(workspaceId)
    return await tagService.detachByNamesFromContacts({
      workspaceId,
      contactIds: parsedInput.ids,
      names: parsedInput.tags,
      accessScope,
    })
  })
