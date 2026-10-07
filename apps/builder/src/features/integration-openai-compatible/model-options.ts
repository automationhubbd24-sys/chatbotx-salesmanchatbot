import {
  type OpenaiCompatiblePresetConfig,
  openaiCompatiblePresetConfigs,
} from "@chatbotx.io/ai"
import type { SelectOption } from "@chatbotx.io/ui/components/form/select-field"
import type { IntegrationOpenaiCompatibleResource } from "./schema/resource"

export function shouldUseCustomOpenaiCompatibleModelInput(
  config: OpenaiCompatiblePresetConfig | undefined,
  kind: "default" | "analyzeImage" | "embedding" = "default",
) {
  const modelOptions = buildOpenaiCompatibleModelOptions(config, kind)
  const allowCustomModelId =
    kind === "embedding"
      ? config?.allowCustomEmbeddingModelId
      : config?.allowCustomModelId
  return Boolean(allowCustomModelId || modelOptions.length === 0)
}

export function buildOpenaiCompatibleModelOptions(
  config: OpenaiCompatiblePresetConfig | undefined,
  kind: "default" | "analyzeImage" | "embedding" = "default",
): SelectOption[] {
  if (kind === "analyzeImage") {
    return config?.analyzeImageModelOptions ?? []
  }

  if (kind === "embedding") {
    return config?.embeddingModelOptions ?? []
  }

  return config?.modelOptions ?? []
}

export function getOpenaiCompatibleIntegrationLabel(
  integration: IntegrationOpenaiCompatibleResource,
) {
  const isCustom = integration.preset === "custom"
  const presetLabel = openaiCompatiblePresetConfigs[integration.preset].label

  return isCustom ? `${presetLabel} - ${integration.name}` : integration.name
}

export function sortOpenaiCompatibleIntegrations(
  integrations: IntegrationOpenaiCompatibleResource[],
) {
  return integrations
    .map((integration, index) => ({ integration, index }))
    .sort((left, right) => {
      const leftSortGroup = left.integration.preset === "custom" ? 1 : 0
      const rightSortGroup = right.integration.preset === "custom" ? 1 : 0

      return leftSortGroup - rightSortGroup || left.index - right.index
    })
    .map(({ integration }) => integration)
}

export function buildOpenaiCompatibleIntegrationOptions({
  integrations,
}: {
  integrations: IntegrationOpenaiCompatibleResource[]
}): SelectOption[] {
  return sortOpenaiCompatibleIntegrations(integrations).map((integration) => ({
    value: integration.id,
    label: getOpenaiCompatibleIntegrationLabel(integration),
    disabled: !integration.enabled,
  }))
}
