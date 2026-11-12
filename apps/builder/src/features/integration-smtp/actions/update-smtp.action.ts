"use server"

import { integrationSmtpService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { prepareSmtpAuth } from "../lib/prepare-smtp-auth"
import { updateSmtpRequest } from "../schema/mutation"

export const updateSmtpAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateSmtpRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    // Merging against the stored auth, the change diff, and the audit record
    // all live in the service.
    const { host, port } = await prepareSmtpAuth(parsedInput)

    return await integrationSmtpService.update({
      workspaceId,
      id,
      data: { ...parsedInput, host, port },
    })
  })
