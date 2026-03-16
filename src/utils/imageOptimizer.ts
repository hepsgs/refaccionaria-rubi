import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
};

/**
 * Optimizes an image file by compressing it and resizing it if necessary.
 * @param file The image file to optimize.
 * @param options Custom compression options.
 * @returns A promise that resolves to the optimized File object.
 */
export const optimizeImage = async (
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<File> => {
  const combinedOptions = { ...defaultOptions, ...options };

  try {
    // browser-image-compression returns a File object (or Blob in some versions)
    const compressedFile = await imageCompression(file as File, combinedOptions);
    
    // Ensure we return a File object with a name if possible
    const fileName = (file as any).name || 'optimized-image.jpg';
    return new File([compressedFile], fileName, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image optimization failed:', error);
    // If it's already a File, return it. If it's a Blob, wrap it in a File.
    if (file instanceof File) return file;
    return new File([file], 'image.jpg', { type: file.type });
  }
};
