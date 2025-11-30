import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
