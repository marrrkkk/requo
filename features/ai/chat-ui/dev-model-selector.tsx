"use client";

import { useState } from "react";
import { ChevronDown, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  autoAiModelOptionValue,
  formatAiProviderName,
  type AiModelOption,
  type AiProviderName,
} from "@/lib/ai/model-options";

// Only render in development
const IS_DEV = process.env.NODE_ENV === "development";

// Models that are actually configured in the capacity selector
const DEV_MODEL_OPTIONS: AiModelOption[] = [
  { provider: "groq", model: "openai/gpt-oss-120b", label: "Groq / gpt-oss-120b", value: "groq|openai/gpt-oss-120b" },
  { provider: "cerebras", model: "zai-glm-4.7", label: "Cerebras / zai-glm-4.7", value: "cerebras|zai-glm-4.7" },
  { provider: "cerebras", model: "gpt-oss-120b", label: "Cerebras / gpt-oss-120b", value: "cerebras|gpt-oss-120b" },
  { provider: "mistral", model: "mistral-medium-latest", label: "Mistral / medium", value: "mistral|mistral-medium-latest" },
  { provider: "mistral", model: "mistral-small-latest", label: "Mistral / small", value: "mistral|mistral-small-latest" },
  { provider: "openrouter", model: "openai/gpt-oss-120b:free", label: "OpenRouter / gpt-oss-120b", value: "openrouter|openai/gpt-oss-120b:free" },
  { provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free", label: "OpenRouter / nemotron-120b", value: "openrouter|nvidia/nemotron-3-super-120b-a12b:free" },
  { provider: "openrouter", model: "deepseek/deepseek-v4-flash:free", label: "OpenRouter / deepseek-v4", value: "openrouter|deepseek/deepseek-v4-flash:free" },
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini / 2.5-flash", value: "gemini|gemini-2.5-flash" },
];

export type DevModelSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DevModelSelector({ value, onChange }: DevModelSelectorProps) {
  if (!IS_DEV) return null;

  const options = DEV_MODEL_OPTIONS;
  const selectedLabel =
    value === autoAiModelOptionValue
      ? "Auto"
      : options.find((o) => o.value === value)?.label ?? "Auto";

  // Group by provider
  const grouped = options.reduce(
    (acc, opt) => {
      const group = acc.get(opt.provider) ?? [];
      group.push(opt);
      acc.set(opt.provider, group);
      return acc;
    },
    new Map<AiProviderName, AiModelOption[]>(),
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Cpu className="size-3" />
          <span className="max-w-[120px] truncate">{selectedLabel}</span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={() => onChange(autoAiModelOptionValue)}
          className={value === autoAiModelOptionValue ? "bg-accent" : ""}
        >
          Auto (capacity-based)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {[...grouped.entries()].map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-wide">
              {formatAiProviderName(provider)}
            </DropdownMenuLabel>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.value}
                onClick={() => onChange(model.value)}
                className={value === model.value ? "bg-accent" : ""}
              >
                <span className="truncate text-xs">{model.model}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
