"use server"

import { sequenceService } from "@salesmanchatbot.io/business/sequence"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"

export const deleteSequenceAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
    } = props

    await sequenceService.delete({ workspaceId, id })
  })
