import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { getCurrentUserAndTargetWorkspace } from "@/lib/auth/utils"

/**
 * Workspace API tokens grant full API access independent of in-app role, so
 * minting or revoking one must require superAdmin — a plain member must not
 * be able to bypass their granular role via a `full` token.
 */
export async function requireWorkspaceTokenSuperAdmin(
  workspaceId: string,
): Promise<void> {
  const currentUserAndTargetWorkspace =
    await getCurrentUserAndTargetWorkspace(workspaceId)
  if (!currentUserAndTargetWorkspace) {
    throw new salesmanChatbotException(
      "You are not authorized to manage this workspace's API tokens",
    )
  }

  const { permissions } = currentUserAndTargetWorkspace.targetWorkspaceMember
  if (!hasWorkspacePermission(permissions, "superAdmin")) {
    throw new salesmanChatbotException(
      "You need to be a super admin to manage workspace API tokens",
    )
  }
}
