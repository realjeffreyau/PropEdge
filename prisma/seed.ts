import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { BOOKMAKERS } from "../constants/bookmakers";
import { ACTIVE_SPORTS } from "../constants/sports";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Sports ────────────────────────────────────────────────────────────
  for (const sport of ACTIVE_SPORTS) {
    await prisma.sport.upsert({
      where: { key: sport.key },
      update: { name: sport.label, active: sport.active },
      create: { key: sport.key, name: sport.label, active: sport.active },
    });
    console.log(`  ✓ Sport: ${sport.label}`);
  }

  // Also seed MLB as inactive placeholder
  await prisma.sport.upsert({
    where: { key: "baseball_mlb" },
    update: { name: "MLB", active: false },
    create: { key: "baseball_mlb", name: "MLB", active: false },
  });
  console.log("  ✓ Sport: MLB (inactive placeholder)");

  // ── Bookmakers ────────────────────────────────────────────────────────
  for (const book of BOOKMAKERS) {
    await prisma.bookmaker.upsert({
      where: { key: book.key },
      update: {
        name: book.label,
        type: book.type,
        active: book.active,
        supportsProps: book.supportsProps,
        isSharpBook: book.isSharp,
        displayOrder: book.displayOrder,
      },
      create: {
        key: book.key,
        name: book.label,
        type: book.type,
        active: book.active,
        supportsProps: book.supportsProps,
        isSharpBook: book.isSharp,
        displayOrder: book.displayOrder,
      },
    });
    console.log(`  ✓ Bookmaker: ${book.label}`);
  }

  // ── Default ModelSettings ─────────────────────────────────────────────
  const existingSettings = await prisma.modelSettings.findFirst();
  if (!existingSettings) {
    await prisma.modelSettings.create({
      data: {
        evWeight: 0.40,
        liquidityWeight: 0.25,
        probabilityEdgeWeight: 0.20,
        whaleWeight: 0.0,
        dataQualityWeight: 0.15,
        minConfidenceToShow: 0.0,
        refreshIntervalMinutes: 10,
        propRefreshIntervalMinutes: 10,
      },
    });
    console.log("  ✓ Default ModelSettings");
  } else {
    console.log("  ↩ ModelSettings already exist, skipping");
  }

  // ── API Provider Config ───────────────────────────────────────────────
  await prisma.apiProviderConfig.upsert({
    where: { providerName: "the_odds_api" },
    update: { enabled: true },
    create: {
      providerName: "the_odds_api",
      enabled: true,
      envVarName: "THE_ODDS_API_KEY",
      settingsJson: {
        regions: ["us"],
        dfsRegions: ["us"],
        bookmakers: ["draftkings", "fanduel", "betmgm", "williamhill_us", "espnbet", "fanatics"],
        dfsBookmakers: ["underdog", "prizepicks", "pick6", "betr_us_dfs"],
        oddsFormat: "american",
      },
    },
  });
  console.log("  ✓ API Provider: The Odds API");

  // ── Admin User ────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail) {
    const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 12) : undefined;
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        inviteStatus: "ACTIVE",
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        email: adminEmail,
        name: "Admin",
        role: "ADMIN",
        inviteStatus: "ACTIVE",
        passwordHash: passwordHash ?? null,
      },
    });
    console.log(`  ✓ Admin user: ${adminEmail}${passwordHash ? " (password set)" : " (no password — add ADMIN_PASSWORD to .env)"}`);
  } else {
    console.log("  ⚠ ADMIN_EMAIL not set — skipping admin user creation");
  }

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
