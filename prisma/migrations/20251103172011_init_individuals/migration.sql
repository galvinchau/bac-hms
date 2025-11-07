-- CreateTable
CREATE TABLE "Individual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "gender" TEXT,
    "ssnLast4" TEXT,
    "branch" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "acceptedServices" TEXT NOT NULL,
    "emergency1Name" TEXT,
    "emergency1Relationship" TEXT,
    "emergency1PhonePrimary" TEXT,
    "emergency1PhoneSecondary" TEXT,
    "emergency1Notes" TEXT,
    "emergency2Name" TEXT,
    "emergency2Relationship" TEXT,
    "emergency2PhonePrimary" TEXT,
    "emergency2PhoneSecondary" TEXT,
    "emergency2Notes" TEXT,
    "billingSameAsPrimary" BOOLEAN NOT NULL DEFAULT true,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingZip" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "repPayeeName" TEXT,
    "repPayeePhone" TEXT,
    "pcpName" TEXT,
    "pcpPhone" TEXT,
    "pcpFax" TEXT,
    "pcpNpi" TEXT,
    "pcpAddress" TEXT,
    "allergies" TEXT,
    "priorityCode" TEXT,
    "mobility" TEXT,
    "equipOxygen" BOOLEAN NOT NULL DEFAULT false,
    "equip_cpap" BOOLEAN NOT NULL DEFAULT false,
    "equip_ventilator" BOOLEAN NOT NULL DEFAULT false,
    "equip_iv_pump" BOOLEAN NOT NULL DEFAULT false,
    "equip_syringe_pump" BOOLEAN NOT NULL DEFAULT false,
    "equip_feeding_tube" BOOLEAN NOT NULL DEFAULT false,
    "equip_nebulizer" BOOLEAN NOT NULL DEFAULT false,
    "equip_wheelchair" BOOLEAN NOT NULL DEFAULT false,
    "equip_hospital_bed" BOOLEAN NOT NULL DEFAULT false,
    "equipOther" TEXT,
    "prefTime" TEXT,
    "prefNotes" TEXT,
    "langPrimary" TEXT,
    "langSecondary" TEXT,
    "caregiverGender" TEXT,
    "prefOther" TEXT,
    "advType" TEXT,
    "advDateIn" TEXT,
    "advDateOut" TEXT,
    "advStatus" TEXT,
    "advPhysician" TEXT,
    "advAttach" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "eligibility" TEXT,
    "notes" TEXT,
    "individualId" TEXT NOT NULL,
    CONSTRAINT "Payer_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "schedule" TEXT,
    "individualId" TEXT NOT NULL,
    CONSTRAINT "Medication_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "icd" TEXT NOT NULL,
    "description" TEXT,
    "onset" TEXT,
    "individualId" TEXT NOT NULL,
    CONSTRAINT "Diagnosis_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Individual_code_key" ON "Individual"("code");
