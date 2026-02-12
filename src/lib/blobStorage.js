import { storage } from './firebaseAdmin';

// Upload image to Firebase Storage
export async function uploadImage(file, folder = 'products') {
  try {
    const bucket = storage.bucket();
    const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
    const pathname = `${folder}/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageFile = bucket.file(pathname);

    await storageFile.save(fileBuffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });

    await storageFile.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${pathname}`;

    return {
      success: true,
      url,
      pathname,
      downloadUrl: url
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function extractPathFromUrl(url) {
  if (!url) return null;

  if (url.startsWith('gs://')) {
    const [, ...parts] = url.replace('gs://', '').split('/');
    return parts.join('/');
  }

  const encodedPathMatch = url.match(/\/o\/([^?]+)/);
  if (encodedPathMatch) {
    return decodeURIComponent(encodedPathMatch[1]);
  }

  const publicPathMatch = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
  if (publicPathMatch) {
    return publicPathMatch[1];
  }

  return null;
}

// Delete image from Firebase Storage
export async function deleteImage(url) {
  try {
    const bucket = storage.bucket();
    const pathname = extractPathFromUrl(url);

    if (!pathname) {
      throw new Error('Invalid storage URL');
    }

    await bucket.file(pathname).delete();

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// List images from a folder
export async function listImages(folder = 'products', limit = 100) {
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `${folder}/`,
      maxResults: limit
    });

    const blobs = files.map((file) => ({
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
      pathname: file.name,
      size: Number(file.metadata.size || 0),
      contentType: file.metadata.contentType || null,
      uploadedAt: file.metadata.timeCreated || null
    }));

    return {
      success: true,
      blobs
    };
  } catch (error) {
    console.error('Error listing images:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Upload multiple images
export async function uploadMultipleImages(files, folder = 'products') {
  const results = [];

  for (const file of files) {
    const result = await uploadImage(file, folder);
    results.push(result);
  }

  return results;
}

// Get optimized image URL (Vercel automatically optimizes)
export function getOptimizedImageUrl(url, width = null, height = null, quality = 80) {
  if (!url) return '';

  // Firebase public object URLs do not support transformation parameters by default.
  let optimizedUrl = url;

  const params = new URLSearchParams();
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  if (quality !== 80) params.append('q', quality);

  if (params.toString()) {
    optimizedUrl += `?${params.toString()}`;
  }

  return optimizedUrl;
}

// Validate image file
export function validateImageFile(file, maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) {
  const errors = [];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`El archivo es muy grande. Tamaño máximo: ${maxSizeMB}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Process image file for upload (client-side)
export function processImageFile(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          // Create new file with compressed blob
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
}
