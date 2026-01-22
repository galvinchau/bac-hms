const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.medicationOrder.count();
  console.log("MedicationOrder count =", count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
