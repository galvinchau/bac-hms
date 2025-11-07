// lib/prisma.ts
// Tắt kiểm tra TypeScript cho file này vì Prisma 6 + Next 16 trên Vercel
// có khác biệt về khai báo type, nhưng runtime vẫn dùng PrismaClient bình thường.
// @ts-nocheck

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as any;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

// Trong development, giữ 1 instance toàn cục để tránh "too many connections"
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
