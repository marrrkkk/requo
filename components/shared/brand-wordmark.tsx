import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "default" | "hero";
};

const sizeStyles: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  default: "text-[1.08rem] leading-[1.04] tracking-[-0.05em]",
  hero: "text-[3.1rem] leading-[1.03] tracking-[-0.08em] sm:text-[3.65rem]",
};

export function BrandWordmark({
  className,
  size = "default",
}: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-heading font-semibold text-primary",
        sizeStyles[size],
        className,
      )}
    >
      Requo
    </span>
  );
}
