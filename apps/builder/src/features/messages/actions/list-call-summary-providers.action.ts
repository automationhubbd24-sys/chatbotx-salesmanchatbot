"use server"

import { listConnectedCallSummaryProviders } from "@salesmanchatbot.io/ai/server"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

/**
 * Connected AI integrations the workspace can use for a call summary, reusing the
 * `getAIIntegrationInDB` registry `summarizeConversation` reads from. Empty when nothing is
 * connected (renders "Connect an AI provider", never an error). A read action, allowed even
 * for an expired/owner-blocked workspace (AGENTS.md invariant #14).
 */
export const listCallSummaryProvidersAction = workspaceActionClientAllowExpired
  .bindArgsSchemas([zodBigintAsString()])
  .action(async ({ bindArgsParsedInputs: [workspaceId] }) => ({
    providers: await listConnectedCallSummaryProviders(workspaceId),
  }))
