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
  passedExifData?: any,
): Promise<ImageCaptureMetadata> => {
  if (passedExifData) {
    const shutter = correctShutterSpeed(passedExifData.ExposureTime);
    return {
      camera: passedExifData.Model,
      iso: passedExifData.ISO,
      aperture: passedExifData.FNumber,
      shutter: shutter,
      focalLength: passedExifData.FocalLength,
      width: passedExifData.ExifImageWidth,
      height: passedExifData.ExifImageHeight,
    };
  } else {
    const exif = await exifr.parse(image);
    console.log(exif)
    // compute corrected shutter speed in case it's a fraction (e.g., 0.005s should be represented as 1/200s)
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
  }
};

function scanMetadata(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const results: any = {};

  const exifOffsets = findSequence(bytes, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  const xmpOffsets = findString(bytes, "<x:xmpmeta");
  const iccOffsets = findString(bytes, "acsp");

  // For XMP, we can actually read the string
  if (xmpOffsets.length > 0) {
    const start = xmpOffsets[0];
    // Slice a chunk (XMP can be large, but let's grab the first 2000 bytes)
    const blob = bytes.slice(start, start + 2000);
    results.xmpRaw = decoder.decode(blob);
  }

  // For ICC/Binary, we usually just look at the raw hex or header
  if (iccOffsets.length > 0) {
    results.iccHeader = bytes.slice(iccOffsets[0], iccOffsets[0] + 32);
  }

  results.offsets = {
    exif: exifOffsets,
    xmp: xmpOffsets,
    icc: iccOffsets,
  };

  return results;
}

function findSequence(bytes: Uint8Array, needle: number[]) {
  const offsets = [];
  outer: for (let i = 0; i < bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    offsets.push(i);
  }
  return offsets; // empty array = not found
}

function findString(bytes: Uint8Array, str: string) {
  return findSequence(
    bytes,
    [...str].map((c) => c.charCodeAt(0)),
  );
}
