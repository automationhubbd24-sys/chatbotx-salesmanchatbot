"use server"
import { customFieldService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { returnValidationErrors } from "next-safe-action"
import { workspaceActionClient } from "@/lib/safe-action"
import { createCustomFieldRequest } from "../schema/action"
export const createCustomFieldAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString()])
  .inputSchema(createCustomFieldRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId], parsedInput }) => {
    try {
      await customFieldService.create({ workspaceId, data: parsedInput })
    } catch (error) {
      if (error instanceof salesmanChatbotException && error.code === "validation") {
        returnValidationErrors(createCustomFieldRequest, {
          _errors: ["Validation Exception"],
          name: { _errors: [error.message] },
        })
      }
      throw error
    }
  })
