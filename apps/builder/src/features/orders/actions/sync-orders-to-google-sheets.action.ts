"use server"

import type { WorkspaceIdRequestParams } from "@/features/common/schema"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { workspaceActionClient } from "@/lib/safe-action"
import { syncOrdersToGoogleSheets } from "../lib/google-sheets-export"
import {
  type SyncOrdersToGoogleSheetsRequest,
  syncOrdersToGoogleSheetsRequest,
} from "../schema/action"

export const syncOrdersToGoogleSheetsAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(syncOrdersToGoogleSheetsRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      parsedInput,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      parsedInput: SyncOrdersToGoogleSheetsRequest
    }) =>
      await syncOrdersToGoogleSheets({
        workspaceId,
        spreadsheetId: parsedInput.spreadsheetId,
        sheetName: parsedInput.sheetName,
        filters: parsedInput,
      }),
  )
