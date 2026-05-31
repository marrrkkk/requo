"use client";

import { Download, FileDown, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  exportBusinessDataAction,
  type DataExportActionState,
} from "@/features/data-export/actions";

const initialState: DataExportActionState = {};

export function DataExportCard() {
  const [state, formAction, isPending] = useActionStateWithSonner(
    exportBusinessDataAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Download all your business data including inquiries, quotes, contacts,
          and files in a portable format.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Format selection */}
          <fieldset disabled={isPending}>
            <legend className="mb-2 text-sm font-medium text-foreground">
              Export format
            </legend>
            <RadioGroup
              defaultValue="json"
              name="format"
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json">JSON</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv">CSV</Label>
              </div>
            </RadioGroup>
          </fieldset>

          {/* Export button */}
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Generating export...
              </>
            ) : (
              <>
                <FileDown data-icon="inline-start" aria-hidden="true" />
                Export Data
              </>
            )}
          </Button>

          {/* Error state with retry */}
          {state.error && !isPending && (
            <Alert variant="destructive">
              <AlertTitle>Export failed</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success state with download link */}
          {state.downloadUrl && !isPending && (
            <Alert>
              <Download className="size-4" />
              <AlertTitle>Export ready</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Your data export is ready.
                  {state.expiresAt && (
                    <> The link expires on{" "}
                    {new Date(state.expiresAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    .</>
                  )}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={state.downloadUrl}
                    download
                    rel="noopener noreferrer"
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    Download
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
