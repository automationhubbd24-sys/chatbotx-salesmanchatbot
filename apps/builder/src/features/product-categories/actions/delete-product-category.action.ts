"use server"

import { productCategoryService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const deleteProductCategoryAction = workspaceActionClientAllowExpired
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async ({ bindArgsParsedInputs: [workspaceId, categoryId] }) => {
    await productCategoryService.delete({ workspaceId, categoryId })
  })
