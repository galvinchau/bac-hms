import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding roles & privileges...");

  // ✅ Direction A: System User Types
  const roles = [
    {
      code: "ADMIN",
      name: "System Administrator",
      description: "Full system access",
    },
    {
      code: "COORDINATOR",
      name: "Coordinator",
      description: "Coordination access",
    },
    {
      code: "OFFICE",
      name: "Office",
      description: "Office access (Time Keeping, ops)",
    },
    {
      code: "DSP",
      name: "Direct Support Professional",
      description: "DSP-level access",
    },
    {
      code: "HR",
      name: "HR",
      description: "HR access (Employees/HR + Time Keeping)",
    },
  ];

  // ✅ Privileges (fine-grained API rights)
  const privileges = [
    { code: "VIEW_INDIVIDUALS", name: "Individuals - View", description: "" },
    {
      code: "EDIT_INDIVIDUALS",
      name: "Individuals - Add/Update",
      description: "",
    },

    { code: "VIEW_SCHEDULE", name: "Schedule - View", description: "" },
    { code: "EDIT_SCHEDULE", name: "Schedule - Add/Update", description: "" },

    { code: "VIEW_PAYROLL", name: "Payroll - View", description: "" },
    { code: "EDIT_PAYROLL", name: "Payroll - Add/Update", description: "" },

    // ✅ NEW: Time Keeping (match UI style)
    { code: "VIEW_TIMEKEEPING", name: "Time Keeping - View", description: "" },
    {
      code: "EDIT_TIMEKEEPING",
      name: "Time Keeping - Add/Update",
      description: "",
    },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
      },
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
      update: {
        name: p.name,
        description: p.description,
      },
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
