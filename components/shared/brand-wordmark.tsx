import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "default" | "hero";
};

const sizeStyles: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  default: "text-[1.32rem] leading-[1.04] tracking-[-0.02em]",
  hero: "text-[3.4rem] leading-[1.03] tracking-[-0.045em] sm:text-[4rem]",
};

export function BrandWordmark({
  className,
  size = "default",
}: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-brand font-bold text-primary",
        sizeStyles[size],
        className,
      )}
    >
      Requo
    </span>
  );
}
