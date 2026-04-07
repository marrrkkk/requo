"use client";

import Cropper, { type Area } from "react-easy-crop";
import { CheckCircle2, ImageIcon } from "lucide-react";
import {
  type ChangeEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
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
import type {
  AccountProfileActionState,
  AccountProfileView,
} from "@/features/account/types";
import {
  profileAvatarAccept,
  profileAvatarAllowedMimeTypes,
  profileAvatarMaxSize,
} from "@/features/account/utils";

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
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fullNameError = state.fieldErrors?.fullName?.[0];
  const jobTitleError = state.fieldErrors?.jobTitle?.[0];
  const phoneError = state.fieldErrors?.phone?.[0];

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save your profile.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <CheckCircle2 data-icon="inline-start" />
          <AlertTitle>Profile saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <input name="removeAvatar" type="hidden" value={String(removeAvatar)} />

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Owner profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-0">
          <FormSection
            description="Upload a profile photo override or fall back to the image from your OAuth provider."
            title="Profile photo"
          >
            <ProfileAvatarField
              disabled={isPending}
              displayName={profile.fullName}
              fieldError={state.fieldErrors?.avatar?.[0]}
              hasUploadedAvatar={Boolean(profile.avatarStoragePath)}
              initialAvatarSrc={profile.avatarSrc}
              oauthAvatarSrc={profile.oauthAvatarSrc}
              removeAvatar={removeAvatar}
              onRemoveAvatarChange={setRemoveAvatar}
            />
          </FormSection>

          <FormSection
            description="These details are used across your account and owner-facing workspace views."
            title="Profile details"
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
                    <Input
                      defaultValue={profile.jobTitle ?? ""}
                      disabled={isPending}
                      id="account-job-title"
                      maxLength={80}
                      minLength={2}
                      name="jobTitle"
                      placeholder="Owner"
                      required
                    />
                    <FieldError
                      errors={jobTitleError ? [{ message: jobTitleError }] : undefined}
                    />
                  </FieldContent>
                </Field>
              </div>

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
                    <FieldDescription>
                      Optional. Keep an owner contact number on file.
                    </FieldDescription>
                    <FieldError
                      errors={phoneError ? [{ message: phoneError }] : undefined}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="account-email">Email</FieldLabel>
                  <FieldContent>
                    <Input
                      disabled
                      id="account-email"
                      readOnly
                      value={profile.email}
                    />
                    <FieldDescription>
                      Your sign-in email is managed through your account identity.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </FormSection>
        </CardContent>
      </Card>

      <div className="toolbar-panel">
        <FormActions align="between" className="pt-0">
          <Button disabled={isPending} size="lg" type="submit">
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Saving profile...
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}

function ProfileAvatarField({
  disabled,
  displayName,
  fieldError,
  hasUploadedAvatar,
  initialAvatarSrc,
  oauthAvatarSrc,
  removeAvatar,
  onRemoveAvatarChange,
}: {
  disabled: boolean;
  displayName: string;
  fieldError?: string;
  hasUploadedAvatar: boolean;
  initialAvatarSrc: string | null;
  oauthAvatarSrc: string | null;
  removeAvatar: boolean;
  onRemoveAvatarChange: (nextValue: boolean) => void;
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Field data-invalid={Boolean(fieldError || localError) || undefined}>
          <FieldLabel htmlFor="profile-avatar">Avatar</FieldLabel>
          <FieldContent>
            <FieldDescription>
              Upload a JPG, PNG, or WEBP avatar up to 2 MB. New uploads open a square crop step before saving.
            </FieldDescription>
            <Input
              ref={inputRef}
              accept={profileAvatarAccept}
              disabled={disabled}
              id="profile-avatar"
              name="avatar"
              onChange={handleAvatarSelection}
              type="file"
            />
            {previewUrl ? (
              <div className="soft-panel mt-3 flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">Cropped avatar ready</p>
                  <p className="text-muted-foreground">
                    This version will replace the current profile photo when you save.
                  </p>
                </div>
                <Button
                  disabled={disabled}
                  onClick={clearPendingAvatar}
                  type="button"
                  variant="outline"
                >
                  Clear
                </Button>
              </div>
            ) : null}
            {hasUploadedAvatar && !previewUrl ? (
              <label className="soft-panel mt-3 flex items-start gap-3 px-4 py-3">
                <input
                  checked={removeAvatar}
                  className="mt-1 size-4 accent-current"
                  disabled={disabled}
                  onChange={(event) => onRemoveAvatarChange(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-foreground">
                    Remove uploaded avatar
                  </span>
                  <span className="text-muted-foreground">
                    {oauthAvatarSrc
                      ? "Saving will fall back to your OAuth profile photo."
                      : "Saving will fall back to your initials."}
                  </span>
                </span>
              </label>
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
          </FieldContent>
        </Field>

        <div className="soft-panel p-4">
          <p className="meta-label">
            {previewUrl ? "New avatar preview" : "Current avatar"}
          </p>
          <div className="soft-panel mt-4 flex min-h-40 items-center justify-center bg-muted/20 p-4 shadow-none">
            {effectivePreviewUrl ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="size-24 border-border/70">
                  <AvatarImage alt={`${displayName} avatar`} src={effectivePreviewUrl} />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">
                  {previewUrl
                    ? "Pending upload preview"
                    : hasUploadedAvatar && !removeAvatar
                      ? "Uploaded avatar"
                      : oauthAvatarSrc
                        ? "OAuth profile photo"
                        : "Initials fallback"}
                </p>
              </div>
            ) : (
              <Empty className="border-0 bg-transparent px-4 py-6 shadow-none">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImageIcon />
                  </EmptyMedia>
                  <EmptyTitle>No avatar uploaded</EmptyTitle>
                  <EmptyDescription>
                    Add a photo to make your owner profile easier to recognize.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
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
        <DialogContent className="gap-0 p-0 sm:max-w-4xl">
          <DialogHeader className="gap-3 border-b border-border/70 pb-4">
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>
              Adjust the framing before the avatar is uploaded to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
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

              <p className="text-sm leading-6 text-muted-foreground">
                Drag the image to reposition it inside the frame, then zoom to tighten the crop.
              </p>
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
                    <p className="text-muted-foreground">
                      The cropped result replaces the upload field and keeps the current save flow.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-border/70">
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
