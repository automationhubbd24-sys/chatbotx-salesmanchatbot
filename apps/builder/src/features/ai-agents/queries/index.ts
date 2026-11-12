"use server"

import { aiAgentService } from "@salesmanchatbot.io/business"
import type { AIAgentModel } from "@salesmanchatbot.io/database/types"
import type { ListAIAgentsRequest } from "@/features/ai-agents/schema/query"
import type { PaginatedResponse } from "@/features/common/schema/pagination"

export async function listAIAgents(
  input: ListAIAgentsRequest,
): Promise<PaginatedResponse<AIAgentModel>> {
  return await aiAgentService.listAIAgents(input)
}
