
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param destinationPath The desired storage path (e.g., "restaurant_logos" or "menu_item_images").
 * @returns Promise<string> The download URL of the uploaded file.
 * @throws Error if upload fails or Firebase Storage is not initialized.
 */
export async function uploadImageAndGetURL(file: File, destinationPath: string): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }

  // Create a unique file name to avoid overwrites
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`; // Sanitize file name a bit
  const storageRef = ref(storage, `${destinationPath}/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
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
