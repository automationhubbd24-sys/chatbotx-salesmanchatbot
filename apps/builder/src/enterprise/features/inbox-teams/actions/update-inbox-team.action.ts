"use server"

import { inboxTeamService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateInboxTeamRequest } from "../schema/action"

export const updateInboxTeamAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateInboxTeamRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, inboxTeamId],
      parsedInput,
    } = props

    return await inboxTeamService.update(
      { workspaceId, inboxTeamId },
      parsedInput,
    )
  })
