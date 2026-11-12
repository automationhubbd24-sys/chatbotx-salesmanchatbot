import {
  userQuotaService,
  workspaceLifecycleService,
} from "@salesmanchatbot.io/business"
import { auditService } from "@salesmanchatbot.io/business/audit"
import { getChildLogger } from "@salesmanchatbot.io/logger"
import { runJobWithAuditContext } from "../../lib/run-job-with-audit-context"
import { allIntegrations } from "../../services/integrations"

const log = getChildLogger("teardown-expired-trial")

export async function teardownExpiredTrial(userId: string): Promise<void> {
  await runJobWithAuditContext(
    { requestedUserId: userId, source: "schedule:teardownExpiredTrial" },
    async () => {
      try {
        const tornDownWorkspaceIds =
          await workspaceLifecycleService.deactivateOwnerWorkspaces({
            ownerId: userId,
            reason: "trial_expired",
            integrations: allIntegrations,
            teardownLevel: "disconnect",
          })
        await userQuotaService.markChannelsTornDown(userId)

        await Promise.all(
          tornDownWorkspaceIds.map((workspaceId) =>
            auditService.record({
              action: "trial_torn_down",
              detail: "Trial expired — channels disconnected",
              userId,
              workspaceId,
              source: "schedule:teardownExpiredTrial",
            }),
          ),
        )
      } catch (err) {
        log.error(
          { err, ownerId: userId },
          "teardownExpiredTrial: owner teardown failed",
        )
        throw err
      }
    },
  )
}
