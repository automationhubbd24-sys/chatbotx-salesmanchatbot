import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    SALESMANCHATBOT_API_KEY: z.string().optional(),
    SALESMANCHATBOT_API_URL: z.url().optional(),
    SALESMANCHATBOT_ALLOW_SELF_SIGNED_CERT: z.enum(["true", "false"]).optional(),
  },
  runtimeEnv: process.env,
})
