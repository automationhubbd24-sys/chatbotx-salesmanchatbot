import {
  adsConversionService,
  withBlockedOwnerGuard,
} from "@salesmanchatbot.io/business"
import type { AdsConversionJobEvaluateConversionTrigger } from "@salesmanchatbot.io/worker-config"

type EvaluateConversionTriggerData =
  AdsConversionJobEvaluateConversionTrigger["data"]

export async function handleEvaluateConversionTrigger(
  data: EvaluateConversionTriggerData,
): Promise<void> {
  await withBlockedOwnerGuard(data.workspaceId, async () => {
    await adsConversionService.evaluateConversionTrigger(data)
  })
}
