import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the admin login page.
 *
 * Mirrors the layout of `AdminLoginForm` so the cross-fade on
 * navigation feels calm: centered card with a branded header,
 * two field placeholders, and a primary action placeholder.
 */
export default function AdminLoginLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandMark href="#" subtitle="Admin" />
          </div>
          <div className="space-y-2">
            <Skeleton className="mx-auto h-6 w-32 rounded-md" />
            <Skeleton className="mx-auto h-4 w-56 rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
