import { seedCatalogue } from "./seed";
try {
  const result = await seedCatalogue();
  console.log("Seed complete:", JSON.stringify(result));
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
