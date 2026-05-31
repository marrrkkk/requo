import {
  businessLogoAllowedMimeTypes,
  businessLogoMaxSize,
} from "@/features/settings/utils";

export type LoadedLogoAsset = {
  file: File;
  url: string;
  width: number;
  height: number;
};

export async function loadLogoAsset(file: File): Promise<LoadedLogoAsset> {
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

export async function createCroppedLogoFile(
  sourceFile: File,
  sourceUrl: string,
  cropAreaPixels: { x: number; y: number; width: number; height: number },
) {
  const image = await loadCanvasImage(sourceUrl);
  const outputMimeType = businessLogoAllowedMimeTypes.includes(
    sourceFile.type as (typeof businessLogoAllowedMimeTypes)[number],
  )
    ? sourceFile.type
    : "image/png";
  const outputExtension = getLogoExtensionForMimeType(outputMimeType);

  for (const maxDimension of [1200, 1024, 896, 768, 640, 512]) {
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
      buildCroppedLogoFileName(sourceFile.name, outputExtension),
      {
        lastModified: Date.now(),
        type: outputMimeType,
      },
    );

    if (croppedFile.size <= businessLogoMaxSize) {
      return croppedFile;
    }
  }

  throw new Error("The cropped logo is still larger than 2 MB. Try a tighter crop or a smaller source image.");
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

function buildCroppedLogoFileName(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return `${baseName || "business-logo"}-cropped${extension}`;
}

function getLogoExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".png";
  }
}

export function getLogoCoverZoom(asset: LoadedLogoAsset) {
  const shortestSide = Math.min(asset.width, asset.height);
  const longestSide = Math.max(asset.width, asset.height);

  if (!shortestSide || !longestSide) {
    return 1;
  }

  return Math.min(4, Math.max(1, longestSide / shortestSide));
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
