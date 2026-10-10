"use client"

import type { ContactFilterField } from "@chatbotx.io/database/partials"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { Calendar } from "@chatbotx.io/ui/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@chatbotx.io/ui/components/ui/popover"
import { cn } from "@chatbotx.io/ui/lib/utils"
import { CalendarDaysIcon, FilterIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { pruneExcludedConditions } from "../lib/prune-conditions"
import { getBrowserTimezone } from "../lib/timezone"
import type { ContactFilterCondition, ContactFilterCriteria } from "../schema"
import { ContactFilterConditionEditDialog } from "./contact-filter-condition-dialog"
import { ContactFilterConditionForm } from "./contact-filter-condition-form"
import { ContactFilterConditionRow } from "./contact-filter-condition-row"
import { useContactFilterConfigs } from "./use-contact-filter-configs"

type ContactListFilterButtonProps = {
  open: boolean
  active: boolean
  onToggle: () => void
  filter: ContactFilterCriteria
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function CustomDateRangePreset({
  customLabel,
  onSelect,
}: {
  customLabel: string
  onSelect: (value: [string, string]) => void
}) {
  const t = useTranslations()
  const [range, setRange] = useState<DateRange>({})

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" type="button" variant="outline">
            <CalendarDaysIcon />
            {customLabel}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          onSelect={(nextRange) => {
            setRange(nextRange ?? {})
            if (nextRange?.from && nextRange.to) {
              onSelect([formatDateKey(nextRange.from), formatDateKey(nextRange.to)])
            }
          }}
          selected={range}
        />
        <p className="px-3 pb-3 text-muted-foreground text-xs">
          {t("fields.contactFilter.datePresets.selectRange")}
        </p>
      </PopoverContent>
    </Popover>
  )
}

export function ContactListFilterButton({
  open,
  active,
  onToggle,
  filter,
}: ContactListFilterButtonProps) {
  const t = useTranslations()

  const filterCount = filter.conditions.length

  return (
    <Button
      onClick={onToggle}
      size="sm"
      variant={active || open ? "default" : "outline"}
    >
      <FilterIcon />
      {t("actions.filter")}
      {filterCount > 0 ? ` (${filterCount})` : ""}
    </Button>
  )
}

type ContactListFilterPanelProps = {
  className?: string
  filter: ContactFilterCriteria
  onFilterChange: (filter: ContactFilterCriteria) => void
  excludeFields?: ContactFilterField[]
  inboxChannel?: string
}

const EMPTY_EXCLUDE_FIELDS: ContactFilterField[] = []

export function ContactListFilterPanel({
  className,
  filter,
  onFilterChange,
  excludeFields = EMPTY_EXCLUDE_FIELDS,
  inboxChannel,
}: ContactListFilterPanelProps) {
  const t = useTranslations()
  const { configs, conditionOptions, operatorLabelByValue } =
    useContactFilterConfigs(inboxChannel, false, filter.conditions)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const filteredConfigs = useMemo(
    () =>
      configs.filter(
        (config) => !excludeFields.includes(config.name as ContactFilterField),
      ),
    [configs, excludeFields],
  )

  useEffect(() => {
    const pruned = pruneExcludedConditions(filter.conditions, excludeFields)
    if (pruned.length !== filter.conditions.length) {
      onFilterChange({
        operator: pruned.length > 0 ? filter.operator : "and",
        conditions: pruned,
        timezone: filter.timezone,
      })
    }
  }, [excludeFields, filter, onFilterChange])

  // Stamp the browser timezone onto an active filter so the backend interprets
  // naive date/datetime values in the user's local zone. Fires at most once per
  // filter (guarded on the absent timezone), mirroring the prune effect above.
  useEffect(() => {
    if (filter.conditions.length > 0 && !filter.timezone) {
      onFilterChange({ ...filter, timezone: getBrowserTimezone() })
    }
  }, [filter, onFilterChange])

  const handleToggleOperator = () => {
    onFilterChange({
      ...filter,
      operator: filter.operator === "and" ? "or" : "and",
    })
  }

  const replaceCreatedAtCondition = (value: string | [string, string]) => {
    onFilterChange({
      ...filter,
      conditions: [
        ...filter.conditions.filter(
          (condition) => condition.field !== "contactCreatedAt",
        ),
        {
          field: "contactCreatedAt",
          operator: Array.isArray(value) ? ("isBetween" as const) : ("eq" as const),
          value,
        },
      ],
    })
  }

  const handleQuickDate = (daysAgo: number) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    replaceCreatedAtCondition(formatDateKey(date))
  }

  const handleAddCondition = (condition: ContactFilterCondition) => {
    onFilterChange({
      ...filter,
      conditions: [...filter.conditions, condition],
    })
  }

  const handleUpdateCondition = (
    index: number,
    condition: ContactFilterCondition,
  ) => {
    onFilterChange({
      ...filter,
      conditions: filter.conditions.map((currentCondition, currentIndex) =>
        currentIndex === index ? condition : currentCondition,
      ),
    })
  }

  const handleRemoveCondition = (index: number) => {
    const conditions = filter.conditions.filter((_, i) => i !== index)
    onFilterChange({
      operator: conditions.length > 0 ? filter.operator : "and",
      conditions,
      timezone: conditions.length > 0 ? filter.timezone : undefined,
    })
  }

  const getConditionKey = (condition: ContactFilterCondition) =>
    `${condition.field}-${"operator" in condition ? condition.operator : "none"}-${
      "value" in condition ? JSON.stringify(condition.value) : "empty"
    }`

  const editingCondition =
    editingIndex === null ? null : (filter.conditions[editingIndex] ?? null)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-muted/20 p-3",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          {t("fields.contactFilter.onlyContactsMatch")}
        </span>
        <button
          className="w-fit font-medium text-primary text-sm underline underline-offset-4"
          onClick={handleToggleOperator}
          type="button"
        >
          {filter.operator === "and"
            ? t("fields.contactFilter.allConditions")
            : t("fields.contactFilter.anyConditions")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleQuickDate(0)}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("fields.contactFilter.datePresets.today")}
        </Button>
        <Button
          onClick={() => handleQuickDate(1)}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("fields.contactFilter.datePresets.yesterday")}
        </Button>
        <CustomDateRangePreset
          customLabel={t("fields.contactFilter.datePresets.custom")}
          onSelect={replaceCreatedAtCondition}
        />
      </div>

      <div className="flex flex-col gap-2">
        {filter.conditions.map((condition, index) => (
          <ContactFilterConditionRow
            configs={configs}
            key={getConditionKey(condition)}
            onEdit={() => setEditingIndex(index)}
            onRemove={() => handleRemoveCondition(index)}
            operatorLabelByValue={operatorLabelByValue}
            row={condition}
          />
        ))}

        <ContactFilterConditionForm
          conditionOptions={conditionOptions}
          configs={filteredConfigs}
          onAdd={handleAddCondition}
        />

        {editingCondition && editingIndex !== null ? (
          <ContactFilterConditionEditDialog
            condition={editingCondition}
            conditionOptions={conditionOptions}
            configs={filteredConfigs}
            key={editingIndex}
            onClose={() => setEditingIndex(null)}
            onSubmit={(data) => {
              handleUpdateCondition(editingIndex, data)
              setEditingIndex(null)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
