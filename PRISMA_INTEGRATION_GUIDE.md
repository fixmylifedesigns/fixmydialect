# Prisma Integration Guide

This guide explains how to integrate the new Prisma database with your existing Firebase app.

## Step 1: Set Up Environment

1. Make sure your `.env` file contains both Firebase and PostgreSQL connection settings:

```
# PostgreSQL connection URL
DATABASE_URL="postgresql://username:password@localhost:5432/any-dialect?schema=public"

# Firebase (existing)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

2. Install Prisma dependencies:

```bash
npm install prisma @prisma/client
npm install -D ts-node
```

## Step 2: Initialize the Database

```bash
# Initialize the Prisma client
npx prisma generate

# Create database tables (the first time)
npx prisma migrate dev --name init

# Seed the database with initial data
npx prisma db seed
```

## Step 3: Access Database User Data

The updated `AuthContext` now provides both Firebase user data and Prisma database user data:

```jsx
import { useAuth } from "@/context/AuthContext";

function YourComponent() {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.displayName || user.email}</h1>

      {/* Access Firebase Auth user data */}
      <p>Firebase UID: {user.uid}</p>

      {/* Access Prisma database user data */}
      {dbUser ? (
        <div>
          <p>Database ID: {dbUser.id}</p>
          <p>Credits: {dbUser.credits}</p>

          {/* Subscription details */}
          {dbUser.subscription && (
            <div>
              <p>Plan: {dbUser.subscription.plan.name}</p>
              <p>Status: {dbUser.subscription.status}</p>
            </div>
          )}
        </div>
      ) : (
        <p>No database user data available</p>
      )}
    </div>
  );
}
```

## Step 4: Updating Database User Data

To update user data in the database:

```javascript
import { updateUserInDatabase } from "@/utils/db-helpers";

// Later in your code:
try {
  const updatedUser = await updateUserInDatabase(user.uid, {
    credits: 100,
    name: "Updated Name",
  });
  console.log("User updated:", updatedUser);
} catch (error) {
  console.error("Failed to update user:", error);
}
```

## Step 5: Example Components

The `AccountSubscriptionInfo.js` component demonstrates how to display subscription information from the Prisma database. You can use this as a reference for integrating Prisma data into your existing components.

## Dual Database Usage

During your transition period, you can use both Firestore and Prisma:

1. The `AuthContext` will continue syncing with Firestore
2. It will also sync with Prisma in parallel
3. Components can use either or both data sources

This allows for a smooth migration from Firestore to Prisma without disrupting existing functionality.

## Database Management Tools

- **View/Edit Data**: Run `npx prisma studio` to open a visual editor
- **Schema Changes**: Update `prisma/schema.prisma` and run `npx prisma migrate dev` to apply changes
