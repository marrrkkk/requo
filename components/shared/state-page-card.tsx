import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatePageCardProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  media?: ReactNode;
};

export function StatePageCard({
  eyebrow,
  title,
  description,
  children,
  actions,
  className,
  media,
}: StatePageCardProps) {
  return (
    <div className="state-page">
      <Card className={cn("mx-auto w-full max-w-2xl gap-0", className)}>
        <CardHeader className="gap-5 pb-5">
          {media ?? <BrandMark subtitle={null} />}
          <div className="flex flex-col gap-2">
            <span className="eyebrow">{eyebrow}</span>
            <CardTitle className="text-3xl sm:text-[2.15rem]">{title}</CardTitle>
            {description ? (
              <CardDescription className="max-w-xl text-sm leading-normal sm:leading-7">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </CardHeader>

        {children ? (
          <CardContent className="flex flex-col gap-3 pt-0">{children}</CardContent>
        ) : null}

        {actions ? (
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
            {actions}
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
