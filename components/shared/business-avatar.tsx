import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type BusinessAvatarProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Set to "eager" for above-the-fold avatars (header). Default is "lazy". */
  loading?: "eager" | "lazy";
};

/**
 * BusinessAvatar — rounded-square avatar for businesses.
 * Shows the business logo when available, otherwise falls back to initials.
 */
export function BusinessAvatar({
  name,
  logoUrl,
  size = "default",
  className,
  loading = "lazy",
}: BusinessAvatarProps) {
  return (
    <Avatar
      size={size}
      className={cn("rounded-lg", className)}
    >
      {logoUrl ? (
        <AvatarImage
          src={logoUrl}
          alt={`${name} logo`}
          className="rounded-lg"
          loading={loading}
          decoding="async"
        />
      ) : null}
      <AvatarFallback className="rounded-lg text-[0.65rem] uppercase tracking-wider">
        {getBusinessInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function getBusinessInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
