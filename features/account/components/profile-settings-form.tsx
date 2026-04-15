"use client";

import Cropper, { type Area } from "react-easy-crop";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Camera } from "lucide-react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import {
  FormSection,
} from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { jobTitleOptions } from "@/features/onboarding/schemas";
import type {
  AccountProfileActionState,
  AccountProfileView,
} from "@/features/account/types";
import {
  profileAvatarAccept,
  profileAvatarAllowedMimeTypes,
  profileAvatarMaxSize,
} from "@/features/account/utils";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

type ProfileSettingsFormProps = {
  action: (
    state: AccountProfileActionState,
    formData: FormData,
  ) => Promise<AccountProfileActionState>;
  profile: AccountProfileView;
};

type LoadedAvatarAsset = {
  file: File;
  url: string;
  width: number;
  height: number;
};

const initialState: AccountProfileActionState = {};

export function ProfileSettingsForm({
  action,
  profile,
}: ProfileSettingsFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [hasPendingAvatar, setHasPendingAvatar] = useState(false);
  const [avatarResetSignal, setAvatarResetSignal] = useState(0);
  const [hasTextInputChanges, setHasTextInputChanges] = useState(false);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? "");
  const fullNameError = state.fieldErrors?.fullName?.[0];
  const jobTitleError = state.fieldErrors?.jobTitle?.[0];
  const phoneError = state.fieldErrors?.phone?.[0];
  const hasControlledChanges = removeAvatar || hasPendingAvatar;
  const hasUnsavedChanges = hasControlledChanges || hasTextInputChanges;
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const inputNames = ["fullName", "jobTitle", "phone"] as const;
    const initialValues = {
      fullName: profile.fullName,
      jobTitle: profile.jobTitle ?? "",
      phone: profile.phone ?? "",
    };

    setHasTextInputChanges(
      inputNames.some((name) => {
        const field = form.elements.namedItem(name);

        if (
          !(field instanceof HTMLInputElement) &&
          !(field instanceof HTMLTextAreaElement)
        ) {
          return false;
        }

        return field.value !== initialValues[name];
      }),
    );
  }, [formRevision, profile.fullName, profile.jobTitle, profile.phone]);

  function handleCancelChanges() {
    formRef.current?.reset();
    setRemoveAvatar(false);
    setHasPendingAvatar(false);
    setAvatarResetSignal((current) => current + 1);
    setJobTitle(profile.jobTitle ?? "");
    setFormRevision((current) => current + 1);
  }

  return (
    <form
      action={formAction}
      className="form-stack pb-28"
      onInputCapture={() => setFormRevision((current) => current + 1)}
      ref={formRef}
    >
      <input name="removeAvatar" type="hidden" value={String(removeAvatar)} />
      <input name="jobTitle" type="hidden" value={jobTitle} />

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-2.5 pb-6">
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
            <ProfileAvatarField
              disabled={isPending}
              displayName={profile.fullName}
              email={profile.email}
              fieldError={state.fieldErrors?.avatar?.[0]}
              hasUploadedAvatar={Boolean(profile.avatarStoragePath)}
              initialAvatarSrc={profile.avatarSrc}
              jobTitle={profile.jobTitle}
              onPendingChange={setHasPendingAvatar}
              oauthAvatarSrc={profile.oauthAvatarSrc}
              removeAvatar={removeAvatar}
              onRemoveAvatarChange={setRemoveAvatar}
              resetSignal={avatarResetSignal}
            />
            <div className="flex min-w-0 flex-col gap-5">
              <FormSection
                className="soft-panel px-5 py-5 shadow-none sm:px-6"
                description="Shown across the workspace."
                title="Name & role"
              >
                <FieldGroup>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Field data-invalid={Boolean(fullNameError) || undefined}>
                      <FieldLabel htmlFor="account-full-name">Full name</FieldLabel>
                      <FieldContent>
                        <Input
                          defaultValue={profile.fullName}
                          disabled={isPending}
                          id="account-full-name"
                          maxLength={120}
                          minLength={2}
                          name="fullName"
                          placeholder="Alicia Cruz"
                          required
                        />
                        <FieldError
                          errors={fullNameError ? [{ message: fullNameError }] : undefined}
                        />
                      </FieldContent>
                    </Field>

                    <Field data-invalid={Boolean(jobTitleError) || undefined}>
                      <FieldLabel htmlFor="account-job-title">Role or title</FieldLabel>
                      <FieldContent>
                        <Combobox
                          aria-invalid={Boolean(jobTitleError) || undefined}
                          disabled={isPending}
                          id="account-job-title"
                          onValueChange={(value) => {
                            setJobTitle(value);
                            setFormRevision((current) => current + 1);
                          }}
                          options={jobTitleOptions}
                          placeholder="Choose your role"
                          searchable
                          searchPlaceholder="Search roles"
                          value={jobTitle}
                        />
                        <FieldError
                          errors={jobTitleError ? [{ message: jobTitleError }] : undefined}
                        />
                      </FieldContent>
                    </Field>
                  </div>
                </FieldGroup>
              </FormSection>

              <FormSection
                className="soft-panel px-5 py-5 shadow-none sm:px-6"
                description="Your direct contact details."
                title="Contact details"
              >
                <FieldGroup>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Field data-invalid={Boolean(phoneError) || undefined}>
                      <FieldLabel htmlFor="account-phone">Phone</FieldLabel>
                      <FieldContent>
                        <Input
                          defaultValue={profile.phone ?? ""}
                          disabled={isPending}
                          id="account-phone"
                          maxLength={32}
                          name="phone"
                          placeholder="+1 555 012 3456"
                        />
                        <FieldDescription>Optional.</FieldDescription>
                        <FieldError
                          errors={phoneError ? [{ message: phoneError }] : undefined}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="account-email">Sign-in email</FieldLabel>
                      <FieldContent>
                        <Input
                          disabled
                          id="account-email"
                          readOnly
                          value={profile.email}
                        />
                        <FieldDescription>Read only.</FieldDescription>
                      </FieldContent>
                    </Field>
                  </div>
                </FieldGroup>
              </FormSection>
            </div>
          </div>
        </CardContent>
      </Card>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved profile changes."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save profile"
        submitPendingLabel="Saving profile..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}

function ProfileAvatarField({
  disabled,
  displayName,
  email,
  fieldError,
  hasUploadedAvatar,
  initialAvatarSrc,
  jobTitle,
  onPendingChange,
  oauthAvatarSrc,
  removeAvatar,
  onRemoveAvatarChange,
  resetSignal,
}: {
  disabled: boolean;
  displayName: string;
  email: string;
  fieldError?: string;
  hasUploadedAvatar: boolean;
  initialAvatarSrc: string | null;
  jobTitle: string | null;
  onPendingChange: (hasPendingChange: boolean) => void;
  oauthAvatarSrc: string | null;
  removeAvatar: boolean;
  onRemoveAvatarChange: (nextValue: boolean) => void;
  resetSignal: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftAsset, setDraftAsset] = useState<LoadedAvatarAsset | null>(null);
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
      setPreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setLocalError(null);
    });
  }, [resetSignal]);

  const effectivePreviewUrl = previewUrl
    ? previewUrl
    : removeAvatar
      ? oauthAvatarSrc
      : initialAvatarSrc;

  async function handleAvatarSelection(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0];

    setLocalError(null);

    if (!nextFile) {
      return;
    }

    try {
      const nextAsset = await loadAvatarAsset(nextFile);

      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return nextAsset;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
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
      const croppedFile = await createCroppedAvatarFile(
        draftAsset.file,
        draftAsset.url,
        croppedAreaPixels,
      );

      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      inputRef.current.files = transfer.files;

      setPreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        return URL.createObjectURL(croppedFile);
      });
      onRemoveAvatarChange(false);
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
          : "We couldn't crop that avatar right now.",
      );
    }
  }

  function clearPendingAvatar() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return null;
    });
    onRemoveAvatarChange(false);
    setLocalError(null);
  }

  return (
    <>
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Profile photo
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Profile identity
              </h2>
              <p className="text-sm text-muted-foreground">Shown across your workspace.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="group relative">
                <input
                  ref={inputRef}
                  accept={profileAvatarAccept}
                  className="sr-only"
                  disabled={disabled}
                  id="profile-avatar"
                  name="avatar"
                  onChange={handleAvatarSelection}
                  type="file"
                />
                <Avatar className="size-24 border border-border/75 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-transform duration-150 group-hover:scale-[1.01] xl:size-28">
                  <AvatarImage alt={`${displayName} avatar`} src={effectivePreviewUrl ?? undefined} />
                  <AvatarFallback className="text-xl">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <label
                  className={cn(
                    "absolute inset-0 flex cursor-pointer items-end justify-end rounded-full focus-within:outline-none",
                    disabled && "pointer-events-none cursor-default opacity-60",
                  )}
                  htmlFor="profile-avatar"
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
                  <span className="absolute inset-0 rounded-full bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10 sm:group-focus-within:bg-foreground/10" />
                  <span className="relative mr-1.5 mb-1.5 inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.14)] transition-[transform,opacity] duration-150 opacity-100 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                    <Camera className="size-4" />
                    <span className="sr-only">
                      {effectivePreviewUrl ? "Update profile photo" : "Upload profile photo"}
                    </span>
                  </span>
                </label>
              </div>

              <div className="min-w-0 max-w-full space-y-2">
                <div className="space-y-1">
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    {displayName}
                  </p>
                  {jobTitle?.trim() && (
                    <p className="text-sm text-muted-foreground">
                      {jobTitle.trim()}
                    </p>
                  )}
                  <p className="break-words text-sm text-muted-foreground">{email}</p>
                </div>

              </div>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5">
            <div className="flex flex-col gap-3">
              {previewUrl ? (
                <div className="soft-panel flex flex-col gap-3 px-4 py-3 text-sm shadow-none sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Cropped photo ready</p>
                    <p className="text-muted-foreground">Applies after save.</p>
                  </div>
                  <Button
                    disabled={disabled}
                    onClick={clearPendingAvatar}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              ) : null}

              {hasUploadedAvatar && !previewUrl ? (
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Button
                      aria-pressed={removeAvatar}
                      disabled={disabled}
                      onClick={() => onRemoveAvatarChange(!removeAvatar)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {removeAvatar ? "Keep photo" : "Remove photo"}
                    </Button>
                  </div>
                  {removeAvatar ? (
                    <p className="text-muted-foreground">
                      {oauthAvatarSrc
                        ? "Falls back to your sign-in photo after save."
                        : "Falls back to your initials after save."}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <FieldError
                errors={
                  localError
                    ? [{ message: localError }]
                    : fieldError
                      ? [{ message: fieldError }]
                      : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCropper();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>Adjust the crop.</DialogDescription>
          </DialogHeader>

          <DialogBody className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col gap-4">
              <div className="soft-panel relative min-h-[24rem] overflow-hidden bg-muted/25">
                {draftAsset ? (
                  <Cropper
                    aspect={1}
                    crop={crop}
                    cropShape="round"
                    image={draftAsset.url}
                    objectFit="cover"
                    onCropChange={setCrop}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                    onZoomChange={setZoom}
                    showGrid={false}
                    zoom={zoom}
                  />
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">Drag and zoom to fit.</p>
            </div>

            <div className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="avatar-crop-zoom">Zoom</FieldLabel>
                  <FieldContent>
                    <input
                      className="h-10 w-full accent-primary"
                      id="avatar-crop-zoom"
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
                Use cropped avatar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function loadAvatarAsset(file: File): Promise<LoadedAvatarAsset> {
  const url = URL.createObjectURL(file);

  try {
    const dimensions = await readImageDimensions(url);

    return {
      file,
      url,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      reject(
        new Error("Choose a JPG, PNG, or WEBP image that can be opened in the browser."),
      );
    };
    image.src = url;
  });
}

async function createCroppedAvatarFile(
  sourceFile: File,
  sourceUrl: string,
  cropAreaPixels: Area,
) {
  const image = await loadCanvasImage(sourceUrl);
  const outputMimeType = profileAvatarAllowedMimeTypes.includes(
    sourceFile.type as (typeof profileAvatarAllowedMimeTypes)[number],
  )
    ? sourceFile.type
    : "image/png";
  const outputExtension = getAvatarExtensionForMimeType(outputMimeType);

  for (const maxDimension of [768, 640, 512, 384]) {
    const scale = Math.min(
      1,
      maxDimension / Math.max(cropAreaPixels.width, cropAreaPixels.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropAreaPixels.width * scale));
    canvas.height = Math.max(1, Math.round(cropAreaPixels.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare that crop.");
    }

    context.drawImage(
      image,
      cropAreaPixels.x,
      cropAreaPixels.y,
      cropAreaPixels.width,
      cropAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        outputMimeType,
        outputMimeType === "image/jpeg" || outputMimeType === "image/webp"
          ? 0.92
          : undefined,
      );
    });

    if (!blob) {
      continue;
    }

    const croppedFile = new File(
      [blob],
      buildCroppedAvatarFileName(sourceFile.name, outputExtension),
      {
        lastModified: Date.now(),
        type: outputMimeType,
      },
    );

    if (croppedFile.size <= profileAvatarMaxSize) {
      return croppedFile;
    }
  }

  throw new Error("The cropped avatar is still larger than 2 MB. Try a tighter crop or a smaller source image.");
}

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("We couldn't render that image for cropping."));
    image.src = url;
  });
}

function buildCroppedAvatarFileName(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return `${baseName || "profile-avatar"}-cropped${extension}`;
}

function getAvatarExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".png";
  }
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
