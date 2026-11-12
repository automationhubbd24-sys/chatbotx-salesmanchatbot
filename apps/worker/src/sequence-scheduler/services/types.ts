export type { DispatchWithRelations } from "@salesmanchatbot.io/database/repositories"

export type DispatchMessage = {
  dispatchId: string
  claimedAt: number
  bucket: number
  workspaceId: string
}
