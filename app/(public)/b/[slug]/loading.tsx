import { Skeleton } from "@/components/ui/skeleton";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function PublicBusinessLoading() {
  return (
    <div className="state-page">
      <Card className="mx-auto w-full max-w-2xl gap-0">
        <CardHeader className="gap-5 pb-5">
          <BrandMark subtitle={null} />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-9 w-56 rounded-lg sm:h-10" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="min-h-[2rem] pt-0" />
      </Card>
    </div>
  );
}
