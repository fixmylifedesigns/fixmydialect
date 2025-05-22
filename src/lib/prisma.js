// src/lib/prisma.js
import { PrismaClient } from "@prisma/client";

// Use global PrismaClient instance to avoid multiple instances during hot reloading
const globalForPrisma = global;

// Initialize prisma client as a global singleton
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
