
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import { validateFileUpload, DEFAULT_IMAGE_VALIDATION } from "./validation";

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param destinationPath The desired storage path (e.g., "restaurant_logos" or "menu_item_images").
 * @returns Promise<string> The download URL of the uploaded file.
 * @throws Error if upload fails, validation fails, or Firebase Storage is not initialized.
 */
export async function uploadImageAndGetURL(file: File, destinationPath: string): Promise<string> {
  console.log("uploadImageAndGetURL called with:", { fileName: file.name, size: file.size, type: file.type, destinationPath });
  
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }

  // Debug Firebase configuration
  console.log("Firebase Storage config:", {
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  });

  // Check if user is authenticated
  const { auth } = await import('./firebase');
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error("User must be authenticated to upload images.");
  }
  
  console.log("User authenticated:", currentUser.uid);

  // Check storage bucket configuration
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error("Firebase Storage bucket is not configured. Please check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.");
  }
  console.log("Storage bucket configured:", storageBucket);

  // Validate file before upload
  const validation = validateFileUpload(file, DEFAULT_IMAGE_VALIDATION);
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // Create a unique file name to avoid overwrites and prevent path traversal
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${sanitizedName}`;
  
  // Ensure the destination path is safe
  const safeDestinationPath = destinationPath.replace(/[<>:"|?*]/g, '_');
  const storageRef = ref(storage, `${safeDestinationPath}/${fileName}`);

  console.log("Starting upload to path:", `${safeDestinationPath}/${fileName}`);

  // Test storage connection
  try {
    const testRef = ref(storage, 'test-connection');
    console.log("Storage reference created successfully");
  } catch (storageError) {
    console.error("Storage connection test failed:", storageError);
    throw new Error(`Storage connection failed: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
  }

  try {
    // Add timeout to prevent infinite loading
    const uploadPromise = uploadBytes(storageRef, file);
    const snapshot = await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      )
    ]);

    console.log("Upload completed, getting download URL...");
    
    const downloadURLPromise = getDownloadURL(snapshot.ref);
    const downloadURL = await Promise.race([
      downloadURLPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('URL retrieval timeout after 10 seconds')), 10000)
      )
    ]);

    console.log('File available at', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    // Attempt to delete the file if upload failed partway or URL retrieval failed, to prevent orphans.
    // This might fail if the file wasn't created, but it's a good cleanup attempt.
    // deleteObject(storageRef).catch(delError => console.warn("Cleanup delete failed:", delError));
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes a file from Firebase Storage.
 * @param fileUrl The download URL of the file to delete.
 * @returns Promise<void>
 * @throws Error if deletion fails.
 */
export async function deleteFileFromURL(fileUrl: string): Promise<void> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }

  try {
    // Extract the file path from the URL
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    
    if (!pathMatch) {
      throw new Error("Invalid file URL format");
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, filePath);
    
    await deleteObject(fileRef);
    console.log('File deleted successfully:', filePath);
  } catch (error) {
    console.error("Error deleting file from Firebase Storage:", error);
    throw new Error(`File deletion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
