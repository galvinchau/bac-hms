import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding roles & privileges...");

  const roles = [
    {
      code: "ADMIN",
      name: "System Administrator",
      description: "Full system access",
    },
    {
      code: "COORDINATOR",
      name: "Coordinator",
      description: "Manage individuals & schedules",
    },
    {
      code: "DSP",
      name: "Direct Support Professional",
      description: "DSP-level access",
    },
  ];

  const privileges = [
    { code: "VIEW_INDIVIDUALS", name: "View Individuals", description: "" },
    { code: "EDIT_INDIVIDUALS", name: "Edit Individuals", description: "" },
    { code: "VIEW_SCHEDULE", name: "View Schedule", description: "" },
    { code: "EDIT_SCHEDULE", name: "Edit Schedule", description: "" },
    { code: "VIEW_PAYROLL", name: "View Payroll", description: "" },
    { code: "EDIT_PAYROLL", name: "Edit Payroll", description: "" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: {
        id: crypto.randomUUID(),
        code: r.code,
        name: r.name,
        description: r.description,
      },
    });
  }

  for (const p of privileges) {
    await prisma.privilege.upsert({
      where: { code: p.code },
      update: {},
      create: {
        id: crypto.randomUUID(),
        code: p.code,
        name: p.name,
        description: p.description,
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
