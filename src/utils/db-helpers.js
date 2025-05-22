// src/utils/db-helpers.js
/**
 * Helper functions to synchronize Firebase Auth users with the Prisma database
 */

// Create or update a user in the Prisma database based on Firebase auth
export async function syncUserWithDatabase(firebaseUser) {
  if (!firebaseUser) return null;

  try {
    // First check if user exists
    const response = await fetch(`/api/user?firebaseId=${firebaseUser.uid}`);

    if (response.ok) {
      // User exists, return the user data
      return await response.json();
    } else if (response.status === 404) {
      // User doesn't exist, create new user
      const createResponse = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebaseId: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || null,
        }),
      });

      if (createResponse.ok) {
        return await createResponse.json();
      } else {
        const error = await createResponse.json();
        console.error("Error creating user in database:", error);
        throw new Error(error.error || "Failed to create user");
      }
    } else {
      // Other error
      const error = await response.json();
      console.error("Error checking user in database:", error);
      throw new Error(error.error || "Failed to check user");
    }
  } catch (error) {
    console.error("Error syncing user with database:", error);
    // Don't throw here - we still want the user to be able to use Firebase auth
    // even if the database sync fails
    return null;
  }
}

// Update user data in the Prisma database
export async function updateUserInDatabase(firebaseId, userData) {
  try {
    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firebaseId,
        ...userData,
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const error = await response.json();
      console.error("Error updating user in database:", error);
      throw new Error(error.error || "Failed to update user");
    }
  } catch (error) {
    console.error("Error updating user in database:", error);
    throw error;
  }
}
