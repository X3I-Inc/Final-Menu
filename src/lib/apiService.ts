import { auth } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types
export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  banner?: string;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  available: boolean;
  categoryId: string;
}

// Authentication helper
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// API base configuration
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://yourdomain.com/api' 
  : 'http://localhost:9002/api';

// Generic API call helper
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Restaurant API functions
export const restaurantAPI = {
  // Get all restaurants for the current user
  async getRestaurants(): Promise<Restaurant[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userDocRef = doc(db, 'user_roles', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User role document not found');
    }

    const userData = userDoc.data();
    const ownedRestaurantIds = userData.ownedRestaurantIds || [];

    if (ownedRestaurantIds.length === 0) {
      return [];
    }

    const restaurants: Restaurant[] = [];
    for (const restaurantId of ownedRestaurantIds) {
      const restaurantDocRef = doc(db, 'restaurants', restaurantId);
      const restaurantDoc = await getDoc(restaurantDocRef);
      
      if (restaurantDoc.exists()) {
        restaurants.push({
          id: restaurantDoc.id,
          ...restaurantDoc.data()
        } as Restaurant);
      }
    }

    return restaurants;
  },

  // Get a specific restaurant by ID
  async getRestaurant(id: string): Promise<Restaurant | null> {
    const restaurantDocRef = doc(db, 'restaurants', id);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      return null;
    }

    return {
      id: restaurantDoc.id,
      ...restaurantDoc.data()
    } as Restaurant;
  },

  // Create a new restaurant
  async createRestaurant(restaurantData: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Restaurant> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const newRestaurant = {
      ...restaurantData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: user.uid,
    };

    const docRef = await addDoc(collection(db, 'restaurants'), newRestaurant);
    
    return {
      id: docRef.id,
      ...newRestaurant
    } as Restaurant;
  },

  // Update a restaurant
  async updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', id);
    await updateDoc(restaurantDocRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  // Delete a restaurant
  async deleteRestaurant(id: string): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', id);
    await deleteDoc(restaurantDocRef);
  },
};

// Menu API functions
export const menuAPI = {
  // Add a new category
  async addCategory(restaurantId: string, categoryData: Omit<Category, 'id' | 'items'>): Promise<Category> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const newCategory: Category = {
      id: Date.now().toString(), // Simple ID generation
      ...categoryData,
      items: [],
    };

    const updatedCategories = [...restaurant.categories, newCategory];
    
    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });

    return newCategory;
  },

  // Update a category
  async updateCategory(restaurantId: string, categoryId: string, updates: Partial<Category>): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const updatedCategories = restaurant.categories.map(category =>
      category.id === categoryId ? { ...category, ...updates } : category
    );

    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });
  },

  // Delete a category
  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const updatedCategories = restaurant.categories.filter(category => category.id !== categoryId);

    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });
  },

  // Add a menu item
  async addMenuItem(restaurantId: string, categoryId: string, itemData: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const newItem: MenuItem = {
      id: Date.now().toString(), // Simple ID generation
      ...itemData,
      categoryId,
    };

    const updatedCategories = restaurant.categories.map(category =>
      category.id === categoryId 
        ? { ...category, items: [...category.items, newItem] }
        : category
    );

    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });

    return newItem;
  },

  // Update a menu item
  async updateMenuItem(restaurantId: string, categoryId: string, itemId: string, updates: Partial<MenuItem>): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const updatedCategories = restaurant.categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            items: category.items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : category
    );

    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });
  },

  // Delete a menu item
  async deleteMenuItem(restaurantId: string, categoryId: string, itemId: string): Promise<void> {
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantDoc = await getDoc(restaurantDocRef);
    
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const restaurant = restaurantDoc.data() as Restaurant;
    const updatedCategories = restaurant.categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            items: category.items.filter(item => item.id !== itemId)
          }
        : category
    );

    await updateDoc(restaurantDocRef, {
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
    });
  },
};

// Subscription API functions
export const subscriptionAPI = {
  // Create checkout session
  async createCheckoutSession(data: {
    tier: string;
    billingInterval: string;
    userId: string;
    userEmail: string;
  }): Promise<{ sessionId: string }> {
    return apiCall('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel subscription
  async cancelSubscription(data: {
    subscriptionId: string;
    userId: string;
  }): Promise<{ success: boolean; subscriptionId: string; status: string; cancelAt: number }> {
    return apiCall('/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update subscription
  async updateSubscription(data: {
    subscriptionId: string;
    newTier: string;
    billingInterval: string;
    userId: string;
  }): Promise<{ success: boolean; subscriptionId: string; tier: string; billingInterval: string; restaurantLimit: number; status: string }> {
    return apiCall('/update-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reactivate subscription
  async reactivateSubscription(data: {
    subscriptionId: string;
    userId: string;
  }): Promise<{ success: boolean; subscriptionId: string; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: number }> {
    return apiCall('/reactivate-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
}; 