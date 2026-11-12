import { assertLicenseAtStartup } from "@salesmanchatbot.io/business/license-startup"

async function bootstrapApp(): Promise<void> {
  await assertLicenseAtStartup()
}

let bootstrapPromise: Promise<void> | null = null

export async function ensureBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = Promise.resolve().then(() => bootstrapApp())
  }

  await bootstrapPromise
}
