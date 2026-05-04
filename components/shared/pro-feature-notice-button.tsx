"use client";

import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type ProFeatureNoticeButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "asChild" | "disabled" | "onClick"
> & {
  noticeTitle?: string;
  noticeDescription?: string;
};

export function ProFeatureNoticeButton({
  children,
  noticeTitle = "This is a Pro feature.",
  noticeDescription = "Upgrade to Pro to use this feature.",
  type = "button",
  ...props
}: ProFeatureNoticeButtonProps) {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button type={type} {...props}>
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{noticeTitle}</PopoverTitle>
          <PopoverDescription>{noticeDescription}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
