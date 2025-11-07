// app/api/individuals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Lưu ý: với Next 16, params là Promise
type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/individuals/[id]
 * Lấy 1 individual + payers + medications + diagnoses
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const individual = await prisma.individual.findUnique({
      where: { id },
      include: {
        payers: true,
        medications: true,
        diagnoses: true,
      },
    });

    if (!individual) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(individual);
  } catch (err: any) {
    console.error("GET /api/individuals/[id] error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/individuals/[id]
 * Update Individual + payers + medications + diagnoses
 * Body là form giống bên Edit (ProfileForm + các field khác)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const body = await req.json();

    // acceptedServices: array -> CSV (giống POST)
    const acceptedServicesCsv = Array.isArray(body.acceptedServices)
      ? body.acceptedServices.join(",")
      : typeof body.acceptedServices === "string"
      ? body.acceptedServices
      : "";

    // map các cờ thiết bị (giống POST)
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

    // Dùng transaction để update main record + các bảng con
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Update Individual
      await tx.individual.update({
        where: { id },
        data: {
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

      const individualId = id;

      // 2) Payers: xoá hết rồi tạo lại (đơn giản, giống create)
      await tx.payer.deleteMany({ where: { individualId } });

      const payers: any[] = Array.isArray(body.billingPayers)
        ? body.billingPayers
        : [];

      if (payers.length > 0) {
        await tx.payer.createMany({
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
        // nếu form không gửi gì, giữ 1 payer primary rỗng
        await tx.payer.create({
          data: {
            type: "Primary",
            name: "",
            memberId: "",
            individualId,
          },
        });
      }

      // 3) Medications
      await tx.medication.deleteMany({ where: { individualId } });
      if (Array.isArray(body.meds) && body.meds.length > 0) {
        await tx.medication.createMany({
          data: body.meds.map((m: any) => ({
            name: m.name ?? "",
            dose: m.dose || null,
            schedule: m.schedule || null,
            individualId,
          })),
        });
      }

      // 4) Diagnoses
      await tx.diagnosis.deleteMany({ where: { individualId } });
      if (Array.isArray(body.dx) && body.dx.length > 0) {
        await tx.diagnosis.createMany({
          data: body.dx.map((d: any) => ({
            icd: d.icd ?? "",
            description: d.description || null,
            onset: d.onset || null,
            individualId,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/individuals/[id] error:", err);
    return NextResponse.json(
      { error: "UPDATE_FAILED", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
