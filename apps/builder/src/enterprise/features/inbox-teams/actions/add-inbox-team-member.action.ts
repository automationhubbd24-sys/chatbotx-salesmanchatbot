"use server"

import { inboxTeamService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { addInboxTeamMemberRequest } from "../schema/action"

export const addInboxTeamMemberAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(addInboxTeamMemberRequest)
  .action(async (props) => {
    const {
      bindArgsClientInputs: [workspaceId, inboxTeamId],
      parsedInput,
    } = props

    return await inboxTeamService.addMembers(
      { workspaceId, inboxTeamId },
      parsedInput.userIds,
    )
  })
