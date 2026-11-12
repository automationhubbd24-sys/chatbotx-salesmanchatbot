import { inboxTeamService } from "@salesmanchatbot.io/business"
import type {
  ListInboxTeamsRequest,
  ListInboxTeamsResponse,
} from "../schema/action"

export async function listInboxTeams(
  input: ListInboxTeamsRequest,
): Promise<ListInboxTeamsResponse> {
  const data = await inboxTeamService.listByWorkspace({
    workspaceId: input.workspaceId,
  })

  return { data }
}
