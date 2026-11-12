import { and, db, eq } from "@salesmanchatbot.io/database/client"
import { sequenceDispatchModel } from "@salesmanchatbot.io/database/schema"
import { logger } from "../../lib/logger"

export class RetrySchedulerService {
  async markDispatchFailed(
    dispatchId: string,
    workspaceId: string,
    errorMessage: string,
  ): Promise<void> {
    await db
      .update(sequenceDispatchModel)
      .set({
        status: "failed",
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sequenceDispatchModel.id, dispatchId),
          eq(sequenceDispatchModel.workspaceId, workspaceId),
          eq(sequenceDispatchModel.status, "running"),
        ),
      )

    logger.error({ dispatchId, errorMessage }, "Dispatch marked as failed")
  }

  async markDispatchCanceled(
    dispatchId: string,
    workspaceId: string,
    reason: string,
  ): Promise<void> {
    await db
      .update(sequenceDispatchModel)
      .set({
        status: "canceled",
        lastError: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sequenceDispatchModel.id, dispatchId),
          eq(sequenceDispatchModel.workspaceId, workspaceId),
          eq(sequenceDispatchModel.status, "running"),
        ),
      )
  }
}
