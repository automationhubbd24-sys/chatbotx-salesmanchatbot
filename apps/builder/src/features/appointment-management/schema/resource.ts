import type { appointmentService } from "@salesmanchatbot.io/business"

export type AppointmentManagementListItem = Awaited<
  ReturnType<typeof appointmentService.list>
>["data"][number]
