import Link from "next/link";

import { cn } from "@/lib/utils";

type TruncatedTextWithTooltipProps = {
  text: string;
  className?: string;
  href?: string;
  prefetch?: boolean;
};

export function TruncatedTextWithTooltip({
  text,
  className,
  href,
  prefetch = true,
}: TruncatedTextWithTooltipProps) {
  if (href) {
    return (
      <Link
        className={cn("block max-w-full truncate", className)}
        href={href}
        prefetch={prefetch}
        title={text}
      >
        {text}
      </Link>
    );
  }

  return (
    <span className={cn("block max-w-full truncate", className)} title={text}>
      {text}
    </span>
  );
}
