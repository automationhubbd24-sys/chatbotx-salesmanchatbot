"use server"

import { returnValidationErrors } from "next-safe-action"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { isValidationException } from "@/lib/errors/validation-exception"
import { workspaceActionClient } from "@/lib/safe-action"
import { exportOrders } from "../lib/export-orders"
import { type ExportOrdersRequest, exportOrdersRequest } from "../schema/action"

export const exportOrdersAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(exportOrdersRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: ExportOrdersRequest
    }) => {
      try {
        return await exportOrders({ workspaceId, filters: parsedInput })
      } catch (error) {
        if (!isValidationException(error)) {
          throw error
        }

        return returnValidationErrors(exportOrdersRequest, {
          _errors: [error.message],
        })
      }
    },
  )
