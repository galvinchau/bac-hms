// prisma/seed.js
// Seed Roles + Privileges cho module Admin Users (BAC-HMS)

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding roles & privileges ...");

  // ===== ROLES (giống danh sách bên Sandata) =====
  const roles = [
    { code: "ACTUALS_ADMIN_ROLE", name: "ACTUALS_ADMIN_ROLE" },
    { code: "ASST_COOR", name: "ASST_COOR" },
    { code: "BILLING", name: "BILLING" },
    { code: "COORDINATOR", name: "COORDINATOR" },
    { code: "GPS_ADMIN_ROLE", name: "GPS_ADMIN_ROLE" },
    { code: "INDIVIDUAL_PROVIDER", name: "INDIVIDUAL PROVIDER" },
    { code: "SECURITY_ADMIN", name: "SECURITY_ADMIN" },
    { code: "STAFF", name: "STAFF" },
    // Nếu sau này Sandata có thêm Role nào, anh chỉ cần thêm object ở đây
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description ?? null,
      },
    });
  }

  // ===== PRIVILEGES (đưa vào những cái anh đang thấy trong Sandata) =====
  // Lưu ý: code là tên kỹ thuật (viết liền, không dấu), name là nhãn dài giống hệt Sandata.
  const privileges = [
    // ACK EXCEPTION
    {
      code: "ACK_CLIENT_SIGNATURE_EXCEPTION",
      name: "ACKNOWLEDGE EXCEPTION: CLIENT SIGNATURE EXCEPTION",
    },
    {
      code: "ACK_NO_SHOW_EXCEPTION",
      name: "ACKNOWLEDGE EXCEPTION: NO SHOW EXCEPTION",
    },
    {
      code: "ACK_SHORT_VISIT",
      name: "ACKNOWLEDGE EXCEPTION: SHORT VISIT",
    },
    {
      code: "ACK_UNMATCHED_CLIENT_ID_PHONE",
      name: "ACKNOWLEDGE EXCEPTION: UNMATCHED CLIENT ID / PHONE",
    },

    // AUTHORIZATIONS
    {
      code: "AUTHORIZATIONS_MAINTENANCE_ACCESS_MODULE",
      name: "AUTHORIZATIONS MAINTENANCE - ACCESS MODULE",
    },

    // CLIENT MODULE (một vài ví dụ; anh có thể bổ sung thêm sau)
    {
      code: "CLIENT_ACCESS_MODULE",
      name: "CLIENT - ACCESS MODULE",
    },
    {
      code: "CLIENT_ADD_UPDATE_AUTH_FOR_HH",
      name: "CLIENT - ADD/UPDATE CLIENT (AUTH) FOR HH PROGRAM",
    },
    {
      code: "CLIENT_ADD_UPDATE_ADDRESS_PHONE_DIAGCODE",
      name: "CLIENT - ADD/UPDATE ADDRESS/PHONE/DIAGCODE",
    },
    {
      code: "CLIENT_BATCH_UPDATE_CLIENTS",
      name: "CLIENT - BATCH UPDATE CLIENTS",
    },
    {
      code: "CLIENT_PROGRAMPAYERADD",
      name: "CLIENT - PROGRAMPAYERADD",
    },
    {
      code: "CLIENT_PROGRAMPAYEREDIT",
      name: "CLIENT - PROGRAMPAYEREDIT",
    },

    // TODO: Sau này anh xem thêm trong Sandata rồi bổ sung vào đây
  ];

  for (const p of privileges) {
    await prisma.privilege.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description ?? null,
      },
      create: {
        code: p.code,
        name: p.name,
        description: p.description ?? null,
      },
    });
  }

  console.log("✅ Seed roles & privileges DONE");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
