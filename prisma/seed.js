// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Parse command line arguments
function parseArgs() {
  const args = {};
  process.argv.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      args[key] = value;
    }
  });
  return args;
}

const args = parseArgs();

async function main() {
  // Create the beta plan with a limit of 100 users
  const betaPlan = await prisma.plan.upsert({
    where: { name: "beta" },
    update: {
      maxUsers: 100,
      currentUsers: 0,
    },
    create: {
      name: "beta",
      priceMonthly: 5.0,
      priceYearly: 50.0,
      lifetimePrice: 100.0,
      accessChatbots: true,
      accessDialects: true,
      maxSavedTranslations: -1, // Unlimited
      maxUsers: 100, // Limited to 100 users
      currentUsers: 0,
    },
  });

  // Create default plans
  const basicPlan = await prisma.plan.upsert({
    where: { name: "basic" },
    update: {},
    create: {
      name: "basic",
      priceMonthly: 5.0,
      priceYearly: 50.0,
      accessChatbots: false,
      accessDialects: true,
      maxSavedTranslations: 100,
      maxUsers: -1, // Unlimited
    },
  });

  const premiumPlan = await prisma.plan.upsert({
    where: { name: "premium" },
    update: {},
    create: {
      name: "premium",
      priceMonthly: 10.0,
      priceYearly: 100.0,
      lifetimePrice: 200.0,
      accessChatbots: true,
      accessDialects: true,
      maxSavedTranslations: -1, // Unlimited
      maxUsers: -1, // Unlimited
    },
  });

  const businessPlan = await prisma.plan.upsert({
    where: { name: "business" },
    update: {},
    create: {
      name: "business",
      priceMonthly: 25.0,
      priceYearly: 250.0,
      lifetimePrice: 500.0,
      accessChatbots: true,
      accessDialects: true,
      maxSavedTranslations: -1, // Unlimited
      maxUsers: -1, // Unlimited
    },
  });

  // Create or update global stats
  const globalStats = await prisma.globalStats.upsert({
    where: { id: "global_stats" },
    update: {},
    create: {
      id: "global_stats",
      lifetimeBusinessPurchases: 0,
      maxLifetimeBusinessPlans: 20,
    },
  });

  // Get user info from command line args, environment variables, or use defaults
  const userEmail =
    args.email || process.env.SEED_USER_EMAIL || "your-email@example.com";
  const firebaseUid =
    args.firebaseUid ||
    process.env.SEED_FIREBASE_UID ||
    "seed-firebase-uid-" + Date.now();
  const userName = args.name || process.env.SEED_USER_NAME || "Admin User";

  // Create the user
  const personalUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      lineId: "fixmylifenyc",
      credits: 1000,
    },
    create: {
      email: userEmail,
      firebaseId: firebaseUid,
      name: userName,
      lineId: "fixmylifenyc",
      credits: 1000,
    },
  });

  // Create a beta subscription for this user
  const personalSubscription = await prisma.subscription.upsert({
    where: { userId: personalUser.id },
    update: {
      planId: betaPlan.id,
      isLifetime: true,
      status: "active",
    },
    create: {
      userId: personalUser.id,
      planId: betaPlan.id,
      isLifetime: true,
      status: "active",
      startDate: new Date(),
    },
  });

  // Increment the beta plan user count
  await prisma.plan.update({
    where: { id: betaPlan.id },
    data: {
      currentUsers: {
        increment: 1,
      },
    },
  });

  console.log({
    betaPlan,
    basicPlan,
    premiumPlan,
    businessPlan,
    globalStats,
    personalUser,
    personalSubscription,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
