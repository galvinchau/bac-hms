// web/app/api/employees/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMobileUserWelcomeEmail } from "@/lib/mailer";

/**
 * Generate an Employee display ID like: BAC-E-2025-001
 * Uses Counter table with key: "EMP-2025"
 */
async function generateEmployeeId() {
  const year = new Date().getFullYear();
  const counterKey = `EMP-${year}`; // lưu trong bảng Counter
  const prefix = `BAC-E-${year}`;

  const counter = await prisma.counter.upsert({
    where: { id: counterKey },
    update: {
      value: {
        increment: 1,
      },
    },
    create: {
      id: counterKey,
      value: 1,
    },
  });

  const seq = counter.value.toString().padStart(3, "0");
  return `${prefix}-${seq}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body || {};

    // Auto-generate employeeId if not provided
    const employeeId: string =
      data.employeeId && data.employeeId !== ""
        ? data.employeeId
        : await generateEmployeeId();

    const employee = await prisma.employee.create({
      data: {
        // Demographics
        firstName: String(data.firstName ?? ""),
        middleName: data.middleName ?? null,
        lastName: String(data.lastName ?? ""),
        dob: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        phone: data.phone ?? null,
        email: String(data.email ?? ""),

        educationLevel: data.educationLevel ?? null,
        ssn: data.ssn ?? null,

        // Employment Info
        employeeId,
        role: data.role ?? null,
        status: data.status ?? null,
        hireDate: data.hireDate ?? null,
        terminationDate: data.terminationDate ?? null,
        employmentType: data.employmentType ?? null,
        branch: data.branch ?? null,
        workLocation: data.workLocation ?? null,
        supervisorName: data.supervisorName ?? null,

        // Address
        address1: data.addressLine1 ?? null,
        address2: data.addressLine2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zipCode ?? null,

        // Emergency Contact
        emergencyName: data.emergencyName ?? null,
        emergencyRelationship: data.emergencyRelationship ?? null,
        emergencyPhone: data.emergencyPhone ?? null,
        emergencyEmail: data.emergencyEmail ?? null,
        emergencyPreferredLanguage: data.emergencyPreferredLanguage ?? null,
        emergencyAddress: data.emergencyAddress ?? null,

        // Work Preferences
        preferredShift: data.preferredShift ?? null,
        canWorkWeekends: !!data.canWorkWeekends,
        canWorkHolidays: !!data.canWorkHolidays,
        maxWeeklyHours:
          data.maxWeeklyHours && data.maxWeeklyHours !== ""
            ? parseInt(data.maxWeeklyHours, 10)
            : null,
        notes: data.notes ?? null,

        // Notification Preferences
        notifyByEmail:
          typeof data.notifyByEmail === "boolean" ? data.notifyByEmail : true,
        notifyBySMS:
          typeof data.notifyBySMS === "boolean" ? data.notifyBySMS : false,
        notifyByInApp:
          typeof data.notifyByInApp === "boolean" ? data.notifyByInApp : true,
        sendScheduleChanges:
          typeof data.sendScheduleChanges === "boolean"
            ? data.sendScheduleChanges
            : true,
        sendPayrollUpdates:
          typeof data.sendPayrollUpdates === "boolean"
            ? data.sendPayrollUpdates
            : true,
        sendPolicyUpdates:
          typeof data.sendPolicyUpdates === "boolean"
            ? data.sendPolicyUpdates
            : true,

        // Mobile user flag
        isMobileUser: !!data.isMobileUser,
      },
    });

    // 🔔 Nếu là Mobile user thì gửi email chào mừng
    try {
      if (employee.isMobileUser && employee.email) {
        await sendMobileUserWelcomeEmail({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          employeeId: employee.employeeId,
        });
      }
    } catch (mailErr) {
      console.error("Failed to send mobile user email:", mailErr);
      // không throw để tránh làm fail việc tạo employee
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { message: "Failed to create employee" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { message: "Failed to load employees" },
      { status: 500 }
    );
  }
}
