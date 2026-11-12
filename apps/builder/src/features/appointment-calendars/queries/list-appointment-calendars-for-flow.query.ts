import { appointmentCalendarService } from "@salesmanchatbot.io/business"
import { assertCurrentUserCanAccessChatbot } from "@/lib/auth/utils"

export async function listAppointmentCalendarsForFlow(input: {
  workspaceId: string
  keyword?: string
}) {
  await assertCurrentUserCanAccessChatbot(input.workspaceId)
  return await appointmentCalendarService.listForFlow(input)
}
