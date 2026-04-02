import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  nextStep: string;
};

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
  bullets,
  nextStep,
}: RoutePlaceholderProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl flex flex-col gap-3">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        <div className="rounded-3xl border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground xl:max-w-sm">
          This route already lives inside the authenticated shell, so future
          feature work can focus on behavior instead of layout or navigation.
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="bg-background/70">
          <CardHeader className="gap-2">
            <CardTitle>What this route is ready for</CardTitle>
            <CardDescription>
              The shared dashboard shell, routing, and workspace access are in
              place for the next product slice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {bullets.map((bullet, index) => (
              <div
                key={bullet}
                className="flex gap-3 rounded-2xl border bg-background/80 px-4 py-3"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-medium text-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {bullet}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted/20">
          <CardHeader className="gap-2">
            <CardTitle>Next implementation slice</CardTitle>
            <CardDescription>
              The layout is stable enough to start shipping page-specific
              behavior.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">{nextStep}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
