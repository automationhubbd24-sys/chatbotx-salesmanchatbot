import {
  type AutomatedResponseType,
  automatedResponseTypes,
} from "@salesmanchatbot.io/database/partials"
import type { AutomatedResponseModel } from "@salesmanchatbot.io/database/types"
import { getSortingStateParser } from "@salesmanchatbot.io/ui/lib/parsers"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server"
import { z } from "zod"
import { parseAsBigInt } from "@/lib/nuqs"

export const listAutomatedResponsesSearchParams = createSearchParamsCache({
  folderId: parseAsBigInt,
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  keyword: parseAsString,
  sort: getSortingStateParser<AutomatedResponseModel>().withDefault([
    { id: "createdAt", desc: true },
  ]),
})

export type ListAutomatedResponsesRequest = Awaited<
  ReturnType<typeof listAutomatedResponsesSearchParams.parse>
> & { workspaceId: string; type: AutomatedResponseType }

export const findAutomatedResponseRequest = z.object({
  workspaceId: zodBigintAsString(),
  id: zodBigintAsString(),
  type: automatedResponseTypes,
})
export type FindAutomatedResponseRequest = z.infer<
  typeof findAutomatedResponseRequest
>
