// lib/prisma.ts
// Tạo PrismaClient singleton, nới lỏng type để tránh lỗi TypeScript trên Vercel.

// Dùng require + any để không bị TS soi export 'PrismaClient'
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as any;

const globalForPrisma = globalThis as any;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

// Giữ 1 instance duy nhất trong development để tránh lỗi "Too many connections"
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
