"use server"

import { userPersistentMenuService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateUserPersistentMenuRequest } from "../schema/action"

export const updateUserPersistentMenuAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateUserPersistentMenuRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props

    await userPersistentMenuService.update({
      id,
      workspaceId,
      name: parsedInput.name,
      menus: parsedInput.persistentMenus,
    })
  })
