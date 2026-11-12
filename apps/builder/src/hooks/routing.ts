"use client"

import { getIdFromParams } from "@salesmanchatbot.io/utils"
import { useParams } from "next/navigation"

export const useWorkspaceId = () => {
  const params = useParams<{ workspaceId: string }>()
  return params ? getIdFromParams(params, "workspaceId") : ""
}
