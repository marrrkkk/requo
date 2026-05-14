"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateString(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  const parsedDate = parseDateString(value);

  if (!parsedDate) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

type DatePickerProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaInvalid?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  required = false,
  ariaInvalid = false,
  className,
  buttonClassName,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateString(value), [value]);
  const currentYear = new Date().getFullYear();

  return (
    <div className={cn("w-full", className)}>
      {name ? (
        <input
          aria-hidden="true"
          className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
          name={name}
          readOnly
          required={required}
          tabIndex={-1}
          type="text"
          value={value}
        />
      ) : null}

      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            aria-invalid={ariaInvalid || undefined}
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
              buttonClassName,
            )}
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          >
            <CalendarIcon data-icon="inline-start" />
            {value ? formatDateLabel(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            autoFocus
            captionLayout="dropdown"
            className="w-full"
            disabled={disabled}
            mode="single"
            fromYear={currentYear - 10}
            toYear={currentYear + 20}
            onSelect={(date) => {
              onChange(date ? toDateInputValue(date) : "");
              setIsOpen(false);
            }}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
