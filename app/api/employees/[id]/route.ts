import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Helper: chọn điều kiện where từ param (có thể là id hoặc employeeId)
function buildWhereFromParam(param: string) {
  if (param.startsWith("BAC-E-")) {
    // Nếu param là mã hiển thị (BAC-E-2025-001...)
    return { employeeId: param };
  }
  // Mặc định là khoá kỹ thuật id (cuid)
  return { id: param };
}

/**
 * Gửi email khi bật Mobile user
 */
async function sendMobileAccessEmail(employee: any) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    MOBILE_APP_LOGIN_URL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.warn("[MobileEmail] SMTP env not fully configured, skip email.");
    return;
  }

  if (!employee.email) {
    console.warn("[MobileEmail] Employee has no email, skip sending.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const loginUrl =
    MOBILE_APP_LOGIN_URL || "https://blueangelscare.org/mobile-login";

  const fullName = `${employee.firstName ?? ""} ${
    employee.lastName ?? ""
  }`.trim();

  const html = `
    <p>Hello ${fullName || "there"},</p>

    <p>Your mobile access for <b>Blue Angels Care</b> has been activated.</p>

    <ul>
      <li><b>Employee ID:</b> ${employee.employeeId}</li>
      <li><b>Login email:</b> ${SMTP_USER}</li>
    </ul>

    <p>Please click the link below to open the mobile login screen and sign in:</p>
    <p><a href="${loginUrl}">${loginUrl}</a></p>

    <p>If this message was not intended for you or you have trouble logging in,
    please contact the Blue Angels Care office.</p>

    <p>Thank you,<br/>
    Blue Angels Care Support Team</p>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: employee.email,
    subject: "Blue Angels Care - Mobile App Access",
    html,
  });
}

/**
 * GET /api/employees/:id
 * Next 16: params là Promise, phải await trước khi dùng.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // 🔑 phải await

    if (!id) {
      return NextResponse.json(
        { message: "Missing employee id" },
        { status: 400 }
      );
    }

    const where = buildWhereFromParam(id);

    const employee = await prisma.employee.findFirst({
      where,
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { message: "Failed to load employee" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employees/:id
 * Update employee theo id hoặc employeeId (tuỳ param).
 * Nếu isMobileUser chuyển từ FALSE -> TRUE thì gửi email kích hoạt.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // 🔑 phải await

    if (!id) {
      return NextResponse.json(
        { message: "Missing employee id" },
        { status: 400 }
      );
    }

    const where = buildWhereFromParam(id);

    // Lấy trạng thái cũ trước khi update
    const existing = await prisma.employee.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = body || {};

    // Tính giá trị mới của isMobileUser
    const newIsMobileUser =
      typeof data.isMobileUser === "boolean"
        ? data.isMobileUser
        : existing.isMobileUser;

    const employee = await prisma.employee.update({
      where, // { id: ... } hoặc { employeeId: ... }
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
        employeeId: data.employeeId ?? undefined, // giữ nguyên nếu không gửi lên
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

        // ✅ Mobile User (giá trị mới đã tính ở trên)
        isMobileUser: newIsMobileUser,
      },
    });

    // Nếu từ FALSE -> TRUE thì gửi email (nhưng không chặn lỗi)
    if (!existing.isMobileUser && newIsMobileUser) {
      try {
        await sendMobileAccessEmail(employee);
      } catch (emailErr) {
        console.error("Failed to send mobile access email (edit):", emailErr);
      }
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { message: "Failed to update employee" },
      { status: 500 }
    );
  }
}
