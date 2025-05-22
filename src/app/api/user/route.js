// src/app/api/user/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET user - get user by firebaseId
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const firebaseId = searchParams.get("firebaseId");

  if (!firebaseId) {
    return NextResponse.json(
      { error: "Firebase ID is required" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// POST user - create a new user from Firebase auth
export async function POST(request) {
  try {
    const { firebaseId, email, name } = await request.json();

    if (!firebaseId || !email) {
      return NextResponse.json(
        { error: "Firebase ID and email are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this Firebase ID already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        firebaseId,
        email,
        name,
        // Default values for other fields are handled by the schema
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PATCH user - update user data
export async function PATCH(request) {
  try {
    const { firebaseId, ...updateData } = await request.json();

    if (!firebaseId) {
      return NextResponse.json(
        { error: "Firebase ID is required" },
        { status: 400 }
      );
    }

    // Remove any fields that shouldn't be directly updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedUser = await prisma.user.update({
      where: { firebaseId },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
