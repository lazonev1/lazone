import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Storage Service - Firebase Storage Operations
 *
 * Handles file uploads for reviews, profiles, etc.
 */

/**
 * Uploads an image to Firebase Storage and returns the download URL
 * @param uri - Local URI of the image (from image picker)
 * @param path - Storage path (e.g., 'reviews/reviewId/image1.jpg')
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
  console.log('[StorageService] Uploading image to:', path);

  try {
    // Fetch the image as a blob
    console.log('[StorageService] Fetching image blob from URI...');
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('[StorageService] Blob created, size:', blob.size, 'bytes');

    // Create a reference to the storage location
    const storageRef = ref(storage, path);

    // Upload the blob
    console.log('[StorageService] Uploading to Firebase Storage...');
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log('[StorageService] Upload successful, bytes transferred:', uploadResult.metadata.size);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[StorageService] Download URL obtained');

    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService] Error uploading image:', error);
    console.error('[StorageService] Error code:', error?.code);
    console.error('[StorageService] Error message:', error?.message);

    // Provide more helpful error messages
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase Storage rules.');
    } else if (error?.code === 'storage/canceled') {
      throw new Error('Upload was cancelled.');
    } else if (error?.code === 'storage/unknown') {
      throw new Error('Storage error: Please ensure Firebase Storage is enabled in your project console.');
    }

    throw error;
  }
}

/**
 * Uploads multiple images for a review
 * @param imageUris - Array of local image URIs
 * @param reviewId - The review ID to organize storage
 * @returns Array of download URLs
 */
export async function uploadReviewImages(
  imageUris: string[],
  reviewId: string
): Promise<string[]> {
  console.log(`[StorageService] Uploading ${imageUris.length} review images for review: ${reviewId}`);

  const uploadPromises = imageUris.map(async (uri, index) => {
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `reviews/${reviewId}/image_${index}_${Date.now()}.${extension}`;
    return uploadImage(uri, path);
  });

  try {
    const urls = await Promise.all(uploadPromises);
    console.log(`[StorageService] All ${urls.length} images uploaded successfully`);
    return urls;
  } catch (error) {
    console.error('[StorageService] Error uploading review images:', error);
    throw error;
  }
}

