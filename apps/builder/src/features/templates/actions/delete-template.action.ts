"use server"

import { templateService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { templateActionClient } from "./template-action-client"

export const deleteTemplateAction = templateActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, templateId],
    } = props
    await templateService.softDelete({ workspaceId, templateId })
  })
