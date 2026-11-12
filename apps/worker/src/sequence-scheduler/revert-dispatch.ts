import { and, db, eq } from "@salesmanchatbot.io/database/client"
import { sequenceDispatchModel } from "@salesmanchatbot.io/database/schema"

export async function revertDispatchToPending(
  dispatchId: string,
  workspaceId: string,
) {
  await db
    .update(sequenceDispatchModel)
    .set({
      status: "pending",
      lockedAt: null,
      lockOwner: null,
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
