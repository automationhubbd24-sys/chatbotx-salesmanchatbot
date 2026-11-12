"use client"

import type { AIProvider } from "@salesmanchatbot.io/ai"
import {
  claudeModelOptions,
  deepseekModelOptions,
  geminiModelOptions,
  openaiModelOptions,
  openrouterModelOptions,
} from "@salesmanchatbot.io/ai"
import { ComboboxField } from "@salesmanchatbot.io/ui/components/form/combobox-field"
import type {
  SelectFieldProps,
  SelectOption,
} from "@salesmanchatbot.io/ui/components/form/select-field"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import type { FieldValues } from "react-hook-form"

const modelOptions: Record<AIProvider, SelectOption[]> = {
  openai: openaiModelOptions,
  claude: claudeModelOptions,
  gemini: geminiModelOptions,
  deepseek: deepseekModelOptions,
  openrouter: openrouterModelOptions,
}

type AIModelSelectProps = SelectFieldProps<FieldValues> & {
  provider: AIProvider | "openaiCompatible"
}

export const AIModelSelect = (props: AIModelSelectProps) => {
  const { provider, ...rest } = props
  const t = useTranslations()

  const options = useMemo(
    () =>
      provider === "openaiCompatible" ? [] : (modelOptions[provider] ?? []),
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
