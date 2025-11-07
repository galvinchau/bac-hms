// app/api/individuals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextIndividualCode } from "@/lib/id";

/**
 * GET /api/individuals
 * Dùng cho Search Individual (list + filter + paging)
 * Query:
 *   q        - text search (code, firstName, lastName, city, county)
 *   page     - page index (1-based)
 *   pageSize - rows per page
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(
    50,
    Math.max(5, Number(searchParams.get("pageSize") || "10") || 10)
  );

  const where =
    q.length > 0
      ? {
          OR: [
            { code: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { city: { contains: q } },
            { county: { contains: q } },
          ],
        }
      : {};

  const [total, items] = await Promise.all([
    prisma.individual.count({ where }),
    prisma.individual.findMany({
      where,
      orderBy: { createdAt: "desc" }, // nếu trong schema có createdAt, không có thì đổi sang code/id
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        dob: true,
        primaryPhone: true,
        email: true,
        city: true,
        county: true,
        state: true,
        zip: true,
        branch: true,
        location: true,
      },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
  });
}

/**
 * POST /api/individuals
 * Tạo Individual mới (giữ nguyên logic cũ anh đang dùng)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1) sinh code
    const code = await nextIndividualCode();

    // 2) acceptedServices: array -> CSV
    const acceptedServicesCsv = Array.isArray(body.acceptedServices)
      ? body.acceptedServices.join(",")
      : "";

    // 3) map các cờ thiết bị
    const equipFlags = {
      equipOxygen: !!body.equip_oxygen || !!body.equipOxygen,
      equip_cpap: !!body.equip_cpap,
      equip_ventilator: !!body.equip_ventilator,
      equip_iv_pump: !!body.equip_iv_pump,
      equip_syringe_pump: !!body.equip_syringe_pump,
      equip_feeding_tube: !!body.equip_feeding_tube,
      equip_nebulizer: !!body.equip_nebulizer,
      equip_wheelchair: !!body.equip_wheelchair,
      equip_hospital_bed: !!body.equip_hospital_bed,
    };

    // 4) tạo Individual chính
    const individual = await prisma.individual.create({
      data: {
        code,

        firstName: body.firstName ?? "",
        middleName: body.middleName || null,
        lastName: body.lastName ?? "",
        dob: body.dob ?? "",
        gender: body.gender || null,
        ssnLast4: body.ssn || null,

        branch: body.branch ?? "",
        location: body.location ?? "",

        primaryPhone: body.primaryPhone || null,
        secondaryPhone: body.secondaryPhone || null,
        email: body.email || null,

        address1: body.address1 || null,
        address2: body.address2 || null,
        city: body.city || null,
        county: body.county || null,
        state: body.state || null,
        zip: body.zip || null,

        acceptedServices: acceptedServicesCsv,

        emergency1Name: body.emergency1?.name || null,
        emergency1Relationship: body.emergency1?.relationship || null,
        emergency1PhonePrimary: body.emergency1?.phonePrimary || null,
        emergency1PhoneSecondary: body.emergency1?.phoneSecondary || null,
        emergency1Notes: body.emergency1?.notes || null,

        emergency2Name: body.emergency2?.name || null,
        emergency2Relationship: body.emergency2?.relationship || null,
        emergency2PhonePrimary: body.emergency2?.phonePrimary || null,
        emergency2PhoneSecondary: body.emergency2?.phoneSecondary || null,
        emergency2Notes: body.emergency2?.notes || null,

        billingSameAsPrimary:
          typeof body.billingSameAsPrimary === "boolean"
            ? body.billingSameAsPrimary
            : true,
        billingAddress1: body.billingAddress1 || null,
        billingAddress2: body.billingAddress2 || null,
        billingCity: body.billingCity || null,
        billingState: body.billingState || null,
        billingZip: body.billingZip || null,

        guardianName: body.guardianName || null,
        guardianPhone: body.guardianPhone || null,
        repPayeeName: body.repPayeeName || null,
        repPayeePhone: body.repPayeePhone || null,

        pcpName: body.pcpName || null,
        pcpPhone: body.pcpPhone || null,
        pcpFax: body.pcpFax || null,
        pcpNpi: body.pcpNpi || null,
        pcpAddress: body.pcpAddress || null,
        allergies: body.allergies || null,

        priorityCode: body.priorityCode || null,
        mobility: body.mobility || null,
        equipOther: body.equipOther || null,
        ...equipFlags,

        prefTime: body.prefTime || null,
        prefNotes: body.prefNotes || null,
        langPrimary: body.langPrimary || null,
        langSecondary: body.langSecondary || null,
        caregiverGender: body.caregiverGender || null,
        prefOther: body.prefOther || null,

        advType: body.advType || null,
        advDateIn: body.advDateIn || null,
        advDateOut: body.advDateOut || null,
        advStatus: body.advStatus || null,
        advPhysician: body.advPhysician || null,
        advAttach: body.advAttach || null,
      },
    });

    const individualId = individual.id;

    // 5) Payers
    const payers: any[] = Array.isArray(body.billingPayers)
      ? body.billingPayers
      : [];

    if (payers.length > 0) {
      await prisma.payer.createMany({
        data: payers.map((p) => ({
          type: p.type ?? "Secondary",
          name: p.name ?? "",
          plan: p.plan || null,
          memberId: p.memberId ?? "",
          groupId: p.groupId || null,
          startDate: p.startDate || null,
          endDate: p.endDate || null,
          eligibility: p.eligibility || null,
          notes: p.notes || null,
          individualId,
        })),
      });
    } else {
      await prisma.payer.create({
        data: {
          type: "Primary",
          name: "",
          memberId: "",
          individualId,
        },
      });
    }

    // 6) Medications
    if (Array.isArray(body.meds) && body.meds.length > 0) {
      await prisma.medication.createMany({
        data: body.meds.map((m: any) => ({
          name: m.name ?? "",
          dose: m.dose || null,
          schedule: m.schedule || null,
          individualId,
        })),
      });
    }

    // 7) Diagnoses
    if (Array.isArray(body.dx) && body.dx.length > 0) {
      await prisma.diagnosis.createMany({
        data: body.dx.map((d: any) => ({
          icd: d.icd ?? "",
          description: d.description || null,
          onset: d.onset || null,
          individualId,
        })),
      });
    }

    return NextResponse.json(
      { id: individualId, code: individual.code },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Create individual error:", err);
    return NextResponse.json(
      { error: "CREATE_FAILED", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
