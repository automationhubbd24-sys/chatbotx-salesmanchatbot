import {
  claudeAnalyzeImageModelOptions,
  geminiAnalyzeImageModelOptions,
  openaiAnalyzeImageModelOptions,
  openrouterAnalyzeImageModelOptions,
} from "@salesmanchatbot.io/ai"
import type { AIAnalyzeImageProvider } from "@salesmanchatbot.io/flow-config"
import { ComboboxField } from "@salesmanchatbot.io/ui/components/form/combobox-field"
import type {
  SelectFieldProps,
  SelectOption,
} from "@salesmanchatbot.io/ui/components/form/select-field"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import type { FieldValues } from "react-hook-form"

const analyzeModelOptions: Record<AIAnalyzeImageProvider, SelectOption[]> = {
  openai: openaiAnalyzeImageModelOptions,
  gemini: geminiAnalyzeImageModelOptions,
  claude: claudeAnalyzeImageModelOptions,
  openrouter: openrouterAnalyzeImageModelOptions,
}

type AIModelSelectProps = SelectFieldProps<FieldValues> & {
  provider: AIAnalyzeImageProvider | "openaiCompatible"
}

export const AIModelSelect = (props: AIModelSelectProps) => {
  const { provider, ...rest } = props
  const t = useTranslations()

  const options = useMemo(
    () =>
      provider === "openaiCompatible"
        ? []
        : (analyzeModelOptions[provider] ?? []),
    [provider],
  )

  return (
    <ComboboxField
      emptyText={t("actions.noRecordFound")}
      label={t("fields.model.label")}
      options={options}
      placeholder={t("actions.pleaseSelect")}
      {...rest}
    />
  )
}
