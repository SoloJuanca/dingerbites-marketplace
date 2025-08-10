import { put, del, list } from '@vercel/blob';

// Upload image to Vercel Blob
export async function uploadImage(file, folder = 'products') {
  try {
    const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Delete image from Vercel Blob
export async function deleteImage(url) {
  try {
    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

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
    const response = await list({
      prefix: `${folder}/`,
      limit,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      success: true,
      blobs: response.blobs
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
  
  // Vercel Blob images are already optimized
  // You can add query parameters for additional optimization if needed
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
