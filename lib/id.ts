// lib/id.ts
import { prisma } from "./prisma";

/**
 * Sinh mã Individual code dạng: BAC-2025-001
 */
export async function nextIndividualCode(): Promise<string> {
  const year = new Date().getFullYear();

  // Key cho bảng Counter, mỗi năm 1 dòng: BAC-2025, BAC-2026, ...
  const key = `BAC-${year}`;

  const row = await prisma.counter.upsert({
    where: { id: key },
    create: { id: key, value: 1 },
    update: { value: { increment: 1 } },
  });

  const num = row.value;
  // 3 chữ số: 001, 002, 003,...
  const padded = String(num).padStart(3, "0");

  // Kết quả cuối: BAC-2025-001
  return `${key}-${padded}`;
}
