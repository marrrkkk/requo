"use client";

import Image from "next/image";
import Cropper, { type Area } from "react-easy-crop";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { businessLogoAccept } from "@/features/settings/utils";
import {
  createCroppedLogoFile,
  getInitials,
  getLogoCoverZoom,
  loadLogoAsset,
  type LoadedLogoAsset,
} from "./logo-utils";

type BusinessLogoFieldProps = {
  businessName: string;
  disabled: boolean;
  fieldError?: string;
  initialPreviewUrl: string | null;
  onPendingChange: (hasPendingChange: boolean) => void;
  removeLogo: boolean;
  resetSignal: number;
  showRemoveToggle: boolean;
  onRemoveLogoChange: (nextValue: boolean) => void;
};

export function BusinessLogoField({
  businessName,
  disabled,
  fieldError,
  initialPreviewUrl,
  onPendingChange,
  removeLogo,
  resetSignal,
  showRemoveToggle,
  onRemoveLogoChange,
}: BusinessLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftAsset, setDraftAsset] = useState<LoadedLogoAsset | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (draftAsset) {
        URL.revokeObjectURL(draftAsset.url);
      }
    };
  }, [draftAsset]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    onPendingChange(Boolean(previewUrl));
  }, [onPendingChange, previewUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setCropOpen(false);
      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return null;
      });
      setPreviewUrl((currentPreviewUrlValue) => {
        if (currentPreviewUrlValue) {
          URL.revokeObjectURL(currentPreviewUrlValue);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setLocalError(null);
    });
  }, [resetSignal]);

  const currentPreviewUrl = !removeLogo ? previewUrl ?? initialPreviewUrl : null;

  async function handleLogoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0];

    setLocalError(null);

    if (!nextFile) {
      return;
    }

    try {
      const nextAsset = await loadLogoAsset(nextFile);
      const nextZoom = getLogoCoverZoom(nextAsset);

      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return nextAsset;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(nextZoom);
      setCroppedAreaPixels(null);
      setCropOpen(true);
    } catch (error) {
      event.currentTarget.value = "";
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't open that image for cropping.",
      );
    }
  }

  function closeCropper() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setCropOpen(false);
    setDraftAsset((currentAsset) => {
      if (currentAsset) {
        URL.revokeObjectURL(currentAsset.url);
      }

      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function applyCrop() {
    if (!draftAsset || !croppedAreaPixels || !inputRef.current) {
      return;
    }

    setLocalError(null);

    try {
      const croppedFile = await createCroppedLogoFile(
        draftAsset.file,
        draftAsset.url,
        croppedAreaPixels,
      );

      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      inputRef.current.files = transfer.files;

      setPreviewUrl((currentPreviewUrlValue) => {
        if (currentPreviewUrlValue) {
          URL.revokeObjectURL(currentPreviewUrlValue);
        }

        return URL.createObjectURL(croppedFile);
      });
      onRemoveLogoChange(false);
      setCropOpen(false);
      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't crop that logo right now.",
      );
    }
  }

  function clearPendingLogo() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setPreviewUrl((currentPreviewUrlValue) => {
      if (currentPreviewUrlValue) {
        URL.revokeObjectURL(currentPreviewUrlValue);
      }

      return null;
    });
    setLocalError(null);
  }

  return (
    <>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="group relative shrink-0">
          <input
            ref={inputRef}
            accept={businessLogoAccept}
            className="sr-only"
            disabled={disabled}
            id="settings-logo"
            name="logo"
            onChange={handleLogoSelection}
            type="file"
          />
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/75 bg-muted/35 sm:size-24">
            {currentPreviewUrl ? (
              <Image
                alt={`${businessName} logo`}
                className="h-full w-full object-cover"
                height={96}
                src={currentPreviewUrl}
                unoptimized
                width={96}
              />
            ) : (
              <span className="text-lg font-semibold uppercase text-foreground">
                {getInitials(businessName)}
              </span>
            )}
          </div>
          <label
            className={cn(
              "absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
              disabled && "pointer-events-none cursor-default opacity-60",
            )}
            htmlFor="settings-logo"
            onKeyDown={(event) => {
              if (
                disabled ||
                (event.key !== "Enter" && event.key !== " ")
              ) {
                return;
              }

              event.preventDefault();
              inputRef.current?.click();
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
          >
            <span className="absolute inset-0 rounded-xl bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/20 sm:group-focus-within:bg-foreground/20" />
            <span className="relative inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-foreground shadow-[var(--surface-shadow-sm)] transition-[transform,opacity] duration-150 opacity-100 sm:scale-95 sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100 sm:group-focus-within:scale-100 sm:group-focus-within:opacity-100">
              <Camera aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                {currentPreviewUrl ? "Update logo" : "Upload logo"}
              </span>
            </span>
          </label>
        </div>

        {previewUrl ? (
          <Button
            disabled={disabled}
            onClick={clearPendingLogo}
            size="sm"
            type="button"
            variant="ghost"
            className="h-auto px-2 py-1 text-xs"
          >
            Clear
          </Button>
        ) : showRemoveToggle ? (
          <Button
            aria-pressed={removeLogo}
            disabled={disabled}
            onClick={() => onRemoveLogoChange(!removeLogo)}
            size="sm"
            type="button"
            variant="ghost"
            className="h-auto px-2 py-1 text-xs"
          >
            {removeLogo ? "Keep" : "Remove"}
          </Button>
        ) : null}

        {localError || fieldError ? (
          <p className="max-w-[10rem] text-center text-xs text-destructive">
            {localError || fieldError}
          </p>
        ) : null}
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCropper();
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Crop logo</DialogTitle>
            <DialogDescription>Fit your logo to the business frame.</DialogDescription>
          </DialogHeader>

          <DialogBody className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col gap-4">
              <div className="soft-panel relative min-h-[26rem] overflow-hidden bg-muted/25">
                {draftAsset ? (
                  <Cropper
                    aspect={1}
                    crop={crop}
                    cropShape="rect"
                    image={draftAsset.url}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onCropComplete={(_, areaPixels) =>
                      setCroppedAreaPixels(areaPixels)
                    }
                    onZoomChange={setZoom}
                    showGrid={false}
                    style={{
                      cropAreaStyle: {
                        borderRadius: "1.5rem",
                      },
                    }}
                    zoom={zoom}
                  />
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">Drag and zoom to fit.</p>
            </div>

            <div className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="logo-crop-zoom">Zoom</FieldLabel>
                  <FieldContent>
                    <input
                      className="h-10 w-full accent-primary"
                      id="logo-crop-zoom"
                      max="4"
                      min="1"
                      onChange={(event) => setZoom(Number(event.currentTarget.value))}
                      step="0.01"
                      type="range"
                      value={zoom}
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {draftAsset ? (
                <div className="soft-panel flex items-start gap-3 px-4 py-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{draftAsset.file.name}</p>
                    <p className="text-muted-foreground">Replaces the upload.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={closeCropper} type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={applyCrop} type="button">
                Use cropped logo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
