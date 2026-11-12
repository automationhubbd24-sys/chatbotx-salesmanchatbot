"use server"
import { customFieldService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { returnValidationErrors } from "next-safe-action"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateCustomFieldRequest } from "../schema/action"
export const updateCustomFieldAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateCustomFieldRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId, id], parsedInput }) => {
    try {
      await customFieldService.update({ workspaceId, id }, parsedInput)
    } catch (error) {
      if (error instanceof salesmanChatbotException && error.code === "validation") {
        returnValidationErrors(updateCustomFieldRequest, {
          _errors: ["Validation Exception"],
          name: { _errors: [error.message] },
        })
      }
      throw error
    }
  })
