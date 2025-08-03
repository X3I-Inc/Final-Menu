import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  runTransaction,
  query, 
  orderBy,
  limit,
  updateDoc,
  arrayUnion,
  deleteDoc,
  // writeBatch, // Not currently used, but good to have for batch operations
} from "firebase/firestore";
import { storage } from './firebase';
import { ref, deleteObject, listAll } from 'firebase/storage';

export interface MenuItem {
  id: string; 
  name: string;
  description: string;
  price: number;
  imageUrl?: string; // Now optional, will default to placeholder if not provided
  isAvailable: boolean;
  dataAiHint?: string;
}

export interface MenuCategory {
  id: string; 
  name: string;
  items: MenuItem[];
}

export interface Restaurant {
  id: string; 
  name: string;
  logoUrl?: string; // Now optional
  logoAiHint?: string;
  description: string;
  contact: {
    phone: string;
    address: string;
    website?: string;
  };
  menuCategories: MenuCategory[];
}

export type NewRestaurantData = {
  name: string;
  description: string;
  contactPhone: string;
  contactAddress: string;
  contactWebsite?: string;
  logoUrl?: string; // This will be the URL from Firebase Storage or placeholder
  logoAiHint?: string;
};

const RESTAURANT_COUNTER_DOC_PATH = "counters/restaurantCounter";

async function getNextRestaurantId(): Promise<string> {
  const counterRef = doc(db, RESTAURANT_COUNTER_DOC_PATH);
  try {
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists() || typeof counterDoc.data().count !== 'number') {
        // Initialize counter if it doesn't exist or count is not a number
        transaction.set(counterRef, { count: 1 });
        return "1";
      }
      const currentCount = counterDoc.data().count as number;
      const nextCount = currentCount + 1;
      transaction.update(counterRef, { count: nextCount });
      return nextCount.toString();
    });
    return newId;
  } catch (error) {
    console.error("Error getting next restaurant ID:", error);
    throw new Error("Could not generate new restaurant ID.");
  }
}

export async function addRestaurant(data: NewRestaurantData): Promise<Restaurant | null> {
  try {
    const newRestaurantIdString = await getNextRestaurantId();
    
    const contactObject: Restaurant['contact'] = {
      phone: data.contactPhone,
      address: data.contactAddress,
    };
    if (data.contactWebsite && data.contactWebsite.trim() !== "") {
      contactObject.website = data.contactWebsite.trim();
    }

    const logoUrlToSave = data.logoUrl && data.logoUrl.trim() !== "" ? data.logoUrl.trim() : `https://placehold.co/100x100.png?text=${encodeURIComponent(data.name.substring(0,2))}`;
    
    let logoAiHintToSave: string;
    if (data.logoAiHint && data.logoAiHint.trim() !== "") {
      logoAiHintToSave = data.logoAiHint.trim().split(' ').slice(0,2).join(' ');
    } else {
      // Use first two words of restaurant name if logoAiHint is not provided
      logoAiHintToSave = data.name.toLowerCase().split(' ').slice(0,2).join(' ');
    }
    
    const restaurantToSave: Omit<Restaurant, 'id'> = {
      name: data.name,
      description: data.description,
      contact: contactObject,
      menuCategories: [ // Initialize with some default categories or an empty array
        { id: `starters-${Date.now()}`, name: 'Starters', items: [] },
        { id: `mains-${Date.now()}`, name: 'Main Courses', items: [] },
        { id: `desserts-${Date.now()}`, name: 'Desserts', items: [] },
        { id: `drinks-${Date.now()}`, name: 'Beverages', items: [] },
      ], 
      logoUrl: logoUrlToSave,
      logoAiHint: logoAiHintToSave,
    };
    
    const restaurantRef = doc(db, "restaurants", newRestaurantIdString);
    await setDoc(restaurantRef, restaurantToSave); 
    
    console.log("Restaurant added to Firestore with ID:", newRestaurantIdString);
    
    const returnedRestaurant: Restaurant = {
      id: newRestaurantIdString,
      ...restaurantToSave
    };
    
    return returnedRestaurant;

  } catch (error) {
    console.error("Error adding restaurant to Firestore:", error);
    return null;
  }
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  try {
    console.log("Fetching all restaurants from Firestore...");
    console.log("Firebase config:", {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    });
    
    const restaurantsCol = collection(db, "restaurants");
    console.log("Collection reference created");
    
    const q = query(restaurantsCol, orderBy("name")); 
    console.log("Query created with orderBy name");
    
    const restaurantSnapshot = await getDocs(q);
    console.log("Snapshot received, empty:", restaurantSnapshot.empty);
    
    const restaurantList = restaurantSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      console.log(`Processing restaurant ${docSnap.id}:`, {
        name: data.name,
        categoriesCount: data.menuCategories?.length || 0
      });
      return {
        id: docSnap.id,
        ...(data as Omit<Restaurant, 'id'>)
      };
    });
    
    console.log("Fetched restaurants:", restaurantList.length, "restaurants found");
    restaurantList.forEach(restaurant => {
      console.log(`Restaurant: ${restaurant.name} (ID: ${restaurant.id}), Categories: ${restaurant.menuCategories.length}`);
    });
    return restaurantList;
  } catch (error) {
    console.error("Error fetching all restaurants:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return [];
  }
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  if (!id || typeof id !== 'string' || id.trim() === "") { 
    console.warn("getRestaurantById called with invalid ID:", id);
    return null;
  }
  try {
    console.log(`Fetching restaurant with ID: ${id} from Firestore...`);
    const restaurantRef = doc(db, "restaurants", id);
    const docSnap = await getDoc(restaurantRef);
    if (docSnap.exists()) {
      const restaurant = { id: docSnap.id, ...(docSnap.data() as Omit<Restaurant, 'id'>) };
      console.log(`Found restaurant: ${restaurant.name}, Categories: ${restaurant.menuCategories.length}`);
      return restaurant;
    } else {
      console.warn("No such restaurant document with ID:", id);
      return null;
    }
  } catch (error) {
    console.warn("Error fetching restaurant by ID:", id, error);
    return null;
  }
}

export async function getDefaultRestaurant(): Promise<Restaurant | null> {
  try {
    const restaurantRef = doc(db, "restaurants", "1"); // Attempt to fetch restaurant with ID "1"
    const docSnap = await getDoc(restaurantRef);
    if (docSnap.exists()) {
      console.log("Default restaurant (ID '1') found.");
      return { id: docSnap.id, ...(docSnap.data() as Omit<Restaurant, 'id'>) };
    } else {
      console.warn("Restaurant with ID '1' not found. Attempting fallback.");
    }
    } catch (error: unknown) {
    // Log as warning if restaurant '1' fetch fails (e.g., permissions, network)
    console.warn(`Attempt to fetch restaurant '1' failed (Error: ${String(error)}). Attempting fallback.`);
  }

  // Fallback: get the first restaurant ordered by name (or by ID if preferred)
  try {
    const restaurantsCol = collection(db, "restaurants");
    // Consider ordering by ID numerically if your IDs are stringified numbers and you want the "earliest"
    // For now, ordering by name as a general fallback.
    const q = query(restaurantsCol, orderBy("name"), limit(1)); 
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      if (docSnap) {
        console.log("Default restaurant fallback: using restaurant with ID:", docSnap.id);
        return { id: docSnap.id, ...(docSnap.data() as Omit<Restaurant, 'id'>) };
      }
    }
    console.warn("No default restaurant found via fallback criteria either.");
    return null;
  } catch (fallbackError) {
    console.warn("Error fetching fallback default restaurant:", fallbackError);
    return null;
  }
}

export async function addMenuItem(
  restaurantId: string,
  categoryId: string, 
  newItemData: Omit<MenuItem, 'id'>
): Promise<boolean> {
  console.log("addMenuItem called with:", { restaurantId, categoryId, newItemData });
  
  if (!restaurantId || !categoryId) {
    console.error("Restaurant ID or Category ID missing for adding menu item.");
    return false;
  }

  try {
    console.log("Getting restaurant document...");
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for adding menu item:", restaurantId);
      return false;
    }

    console.log("Restaurant found, processing data...");
    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>; 
    const newMenuItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    let dataAiHintValue = newItemData.dataAiHint && newItemData.dataAiHint.trim() !== "" 
      ? newItemData.dataAiHint.trim().split(' ').slice(0,2).join(' ')
      : newItemData.name.toLowerCase().split(' ').slice(0,2).join(' ');
    if (!dataAiHintValue) dataAiHintValue = "food item";

    const menuItemToAdd: MenuItem = { 
      ...newItemData, 
      id: newMenuItemId,
      imageUrl: newItemData.imageUrl && newItemData.imageUrl.trim() !== "" ? newItemData.imageUrl : `https://placehold.co/600x400.png?text=${encodeURIComponent(newItemData.name.substring(0,10))}`,
      dataAiHint: dataAiHintValue,
    };

    console.log("Created menu item:", menuItemToAdd);

    const currentCategories = restaurantData.menuCategories || [];
    console.log("Current categories:", currentCategories.length);
    
    const categoryIndex = currentCategories.findIndex(c => c.id === categoryId);
    console.log("Category index found:", categoryIndex);

    if (categoryIndex === -1) {
      console.error("Category ID not found in restaurant for adding menu item:", categoryId, restaurantId);
      return false; 
    }
    
    // Create a deep copy to safely modify
    const updatedMenuCategories = JSON.parse(JSON.stringify(currentCategories)) as MenuCategory[];
    
    // TypeScript guard to ensure the category exists
    const category = updatedMenuCategories[categoryIndex];
    if (!category) {
      console.error("Category not found at index:", categoryIndex);
      return false;
    }
    
    if (!category.items) {
      category.items = [];
    }
    category.items.push(menuItemToAdd);

    console.log("Updating Firestore document...");
    await updateDoc(restaurantRef, {
      menuCategories: updatedMenuCategories
    });
    
    console.log("Menu item added to Firestore for restaurant:", restaurantId, "category:", categoryId);
    return true;
  } catch (error) {
    console.error("Error adding menu item to Firestore:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return false;
  }
}

export async function addMenuCategory(restaurantId: string, categoryName: string): Promise<MenuCategory | null> {
  if (!restaurantId || !categoryName || categoryName.trim() === "") {
    console.error("Restaurant ID or Category Name missing/invalid for adding menu category.");
    return null;
  }

  try {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    
    const slugifiedName = categoryName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newCategoryId = `${slugifiedName}-${Date.now()}`;
    
    const newCategory: MenuCategory = {
      id: newCategoryId,
      name: categoryName.trim(),
      items: [],
    };

    // Atomically add the new category to the menuCategories array
    await updateDoc(restaurantRef, {
      menuCategories: arrayUnion(newCategory)
    });
    
    console.log("Menu category added to Firestore for restaurant:", restaurantId);
    return newCategory; // Return the new category as it was added
  } catch (error) {
    console.error("Error adding menu category to Firestore:", error);
    return null;
  }
}

export async function deleteMenuItem(
  restaurantId: string,
  categoryId: string,
  itemId: string
): Promise<boolean> {
  if (!restaurantId || !categoryId || !itemId) {
    console.error("Missing required parameters for deleting menu item:", { restaurantId, categoryId, itemId });
    return false;
  }

  try {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for deleting menu item:", restaurantId);
      return false;
    }

    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>;
    const currentCategories = restaurantData.menuCategories || [];
    const categoryIndex = currentCategories.findIndex(c => c.id === categoryId);

    if (categoryIndex === -1) {
      console.error("Category ID not found in restaurant for deleting menu item:", categoryId, restaurantId);
      return false;
    }

    // Create a deep copy to safely modify
    const updatedMenuCategories = JSON.parse(JSON.stringify(currentCategories)) as MenuCategory[];
    
    // TypeScript guard to ensure the category exists
    const category = updatedMenuCategories[categoryIndex];
    if (!category) {
      console.error("Category not found at index:", categoryIndex);
      return false;
    }
    
    if (!category.items) {
      console.error("No items array found in category:", categoryId);
      return false;
    }

    // Filter out the item to delete
    category.items = category.items.filter(
      item => item.id !== itemId
    );

    await updateDoc(restaurantRef, {
      menuCategories: updatedMenuCategories
    });
    
    console.log("Menu item deleted from Firestore for restaurant:", restaurantId, "category:", categoryId, "item:", itemId);
    return true;
  } catch (error) {
    console.error("Error deleting menu item from Firestore:", error);
    return false;
  }
}

export async function deleteRestaurant(restaurantId: string): Promise<boolean> {
  if (!restaurantId) {
    console.error("Missing restaurant ID for deletion");
    return false;
  }

  try {
    // First, get the restaurant data to find all image URLs
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for deletion:", restaurantId);
      return false;
    }

    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>;

    // Delete all menu item images
    const menuItemsImagesRef = ref(storage, `menu_item_images/${restaurantId}`);
    try {
      const menuItemsImagesList = await listAll(menuItemsImagesRef);
      const deletePromises = menuItemsImagesList.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      console.log("Deleted all menu item images for restaurant:", restaurantId);
    } catch (error) {
      console.error("Error deleting menu item images:", error);
      // Continue with restaurant deletion even if image deletion fails
    }

    // Delete restaurant logo if it's not a placeholder
    if (restaurantData.logoUrl && !restaurantData.logoUrl.includes('placehold.co')) {
      try {
        const logoRef = ref(storage, restaurantData.logoUrl);
        await deleteObject(logoRef);
        console.log("Deleted restaurant logo:", restaurantData.logoUrl);
      } catch (error) {
        console.error("Error deleting restaurant logo:", error);
        // Continue with restaurant deletion even if logo deletion fails
      }
    }

    // Finally, delete the restaurant document
    await deleteDoc(restaurantRef);
    console.log("Restaurant deleted from Firestore:", restaurantId);
    return true;
  } catch (error) {
    console.error("Error deleting restaurant from Firestore:", error);
    return false;
  }
}

export async function deleteMenuCategory(
  restaurantId: string,
  categoryId: string
): Promise<boolean> {
  if (!restaurantId || !categoryId) {
    console.error("Missing required parameters for deleting menu category:", { restaurantId, categoryId });
    return false;
  }

  try {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for deleting menu category:", restaurantId);
      return false;
    }

    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>;
    const currentCategories = restaurantData.menuCategories || [];
    
    // Filter out the category to delete
    const updatedMenuCategories = currentCategories.filter(category => category.id !== categoryId);

    await updateDoc(restaurantRef, {
      menuCategories: updatedMenuCategories
    });
    
    console.log("Menu category deleted from Firestore for restaurant:", restaurantId, "category:", categoryId);
    return true;
  } catch (error) {
    console.error("Error deleting menu category from Firestore:", error);
    return false;
  }
}

export async function updateMenuItem(
  restaurantId: string,
  categoryId: string,
  itemId: string,
  updatedItemData: Partial<Omit<MenuItem, 'id'>>
): Promise<boolean> {
  if (!restaurantId || !categoryId || !itemId) {
    console.error("Missing required parameters for updating menu item:", { restaurantId, categoryId, itemId });
    return false;
  }

  try {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for updating menu item:", restaurantId);
      return false;
    }

    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>;
    const currentCategories = restaurantData.menuCategories || [];
    const categoryIndex = currentCategories.findIndex(c => c.id === categoryId);

    if (categoryIndex === -1) {
      console.error("Category ID not found in restaurant for updating menu item:", categoryId, restaurantId);
      return false;
    }

    // Create a deep copy to safely modify
    const updatedMenuCategories = JSON.parse(JSON.stringify(currentCategories)) as MenuCategory[];
    
    // TypeScript guard to ensure the category exists
    const category = updatedMenuCategories[categoryIndex];
    if (!category) {
      console.error("Category not found at index:", categoryIndex);
      return false;
    }
    
    if (!category.items) {
      console.error("No items array found in category:", categoryId);
      return false;
    }

    const itemIndex = category.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      console.error("Item not found in category:", itemId, categoryId);
      return false;
    }

    // Update the item with new data
    category.items[itemIndex] = {
      ...category.items[itemIndex],
      ...updatedItemData
    } as MenuItem;

    await updateDoc(restaurantRef, {
      menuCategories: updatedMenuCategories
    });
    
    console.log("Menu item updated in Firestore for restaurant:", restaurantId, "category:", categoryId, "item:", itemId);
    return true;
  } catch (error) {
    console.error("Error updating menu item in Firestore:", error);
    return false;
  }
}

export async function updateRestaurant(
  restaurantId: string,
  updatedData: Partial<Omit<Restaurant, 'id' | 'menuCategories'>>
): Promise<boolean> {
  if (!restaurantId) {
    console.error("Missing restaurant ID for updating restaurant");
    return false;
  }

  try {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      console.error("Restaurant not found for updating:", restaurantId);
      return false;
    }

    const restaurantData = restaurantSnap.data() as Omit<Restaurant, 'id'>;
    
    // Create a deep copy to safely modify
    const updatedRestaurantData = {
      ...restaurantData,
      ...updatedData
    };

    await updateDoc(restaurantRef, updatedRestaurantData);
    
    console.log("Restaurant updated in Firestore:", restaurantId);
    return true;
  } catch (error) {
    console.error("Error updating restaurant in Firestore:", error);
    return false;
  }
}
