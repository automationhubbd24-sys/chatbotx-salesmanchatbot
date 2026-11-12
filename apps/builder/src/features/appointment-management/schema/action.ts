import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { z } from "zod"

export const appointmentIdRequest = z.object({
  appointmentId: zodBigintAsString(),
})
export type AppointmentIdRequest = z.infer<typeof appointmentIdRequest>
