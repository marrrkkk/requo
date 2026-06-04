import { Skeleton } from "@/components/ui/skeleton";

/**
 * A skeleton placeholder for auth forms (login/signup).
 * Displays placeholder shapes for social buttons, divider, form fields, and submit button.
 */
export function AuthFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Social auth button placeholder */}
      <Skeleton className="h-10 w-full rounded-md" />
      {/* Divider */}
      <Skeleton className="h-4 w-full rounded-md" />
      {/* Email field */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      {/* Password field */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      {/* Submit button */}
      <Skeleton className="mt-2 h-10 w-full rounded-md" />
    </div>
  );
}
