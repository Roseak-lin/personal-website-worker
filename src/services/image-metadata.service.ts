import * as exifr from "exifr";
import { ImageCaptureMetadata } from "../types/image-capture-metadata";

function correctShutterSpeed(shutter: number): string | undefined {
  if (!shutter || shutter <= 0) return undefined;

  if (shutter >= 1) {
    return shutter % 1 === 0 ? `${shutter}s` : `${shutter.toFixed(1)}s`;
  }

  const denominator = Math.round(1 / shutter);

  return `1/${denominator}`;
}

export const getExifData = async (
  image: ArrayBuffer,
): Promise<ImageCaptureMetadata> => {
  const exif = await exifr.parse(image);
  const shutter = correctShutterSpeed(exif?.ExposureTime);
  return {
    camera: exif?.Model,
    iso: exif?.ISO,
    aperture: exif?.FNumber,
    shutter: shutter,
    focalLength: exif?.FocalLength,
    width: exif?.ExifImageWidth,
    height: exif?.ExifImageHeight,
  };
};
