import type {
  AlertItem,
  AppointmentRow,
  ChoreRow,
  ComplianceItem,
  CoverageShift,
  FireDrillRow,
  HouseSummary,
  MealRow,
  MedTaskRow,
  ResidentRow,
  SpecialistVisitRow,
  StaffRow,
  TimelineItem,
} from "./shared";

export const DEMO_HOUSES: HouseSummary[] = [
  {
    id: "house-1",
    code: "HM-1001",
    name: "Maple Residential Home",
    address: "202 Campbell Ave, Altoona, PA 16602",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 1,
    assignedStaff: 8,
    complianceScore: 93,
    openAlerts: 2,
    status: "ACTIVE",
    risk: "WARNING",
    supervisor: "Anna Smith",
    county: "Blair",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "SINGLE",
    houseBillingNote:
      "24/7 housing revenue remains full even when resident has scheduled home visit hours.",
  },
  {
    id: "house-2",
    code: "HM-1002",
    name: "Cedar Community Home",
    address: "415 Pine St, Hollidaysburg, PA 16648",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 2,
    assignedStaff: 10,
    complianceScore: 96,
    openAlerts: 1,
    status: "ACTIVE",
    risk: "GOOD",
    supervisor: "Mike Lee",
    county: "Blair",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "DOUBLE",
    houseBillingNote:
      "Shared house model may lower per-resident care rate while housing occupancy remains full.",
  },
  {
    id: "house-3",
    code: "HM-1003",
    name: "Sunrise Support Home",
    address: "89 Logan Blvd, Altoona, PA 16602",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 3,
    assignedStaff: 14,
    complianceScore: 78,
    openAlerts: 4,
    status: "ACTIVE",
    risk: "CRITICAL",
    supervisor: "Kevin Brown",
    county: "Centre",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "MIXED",
    houseBillingNote:
      "Higher shared-support complexity with some shifts requiring multiple DSP for one resident.",
  },
];

export const DEMO_RESIDENTS: ResidentRow[] = [
  {
    id: "IND-1001",
    name: "John Doe",
    maNumber: "MA-22001",
    age: 31,
    gender: "Male",
    room: "Room 1",
    residentialType: "FULL_TIME_247",
    homeVisitSchedule: "No scheduled home visit",
    housingCoverage: "24/7",
    careRateTier: "HIGHER",
    ispStatus: "CURRENT",
    riskFlag: "HIGH",
    behaviorSupportLevel: "INTENSIVE",
    medProfile: "MULTIPLE_DAILY",
    appointmentLoad: "HIGH",
    status: "ACTIVE",
  },
  {
    id: "IND-1002",
    name: "Emily Stone",
    maNumber: "MA-22002",
    age: 28,
    gender: "Female",
    room: "Room 2",
    residentialType: "HOME_VISIT_SPLIT",
    homeVisitSchedule: "Home visit Fri 5 PM - Sun 6 PM",
    housingCoverage: "24/7",
    careRateTier: "STANDARD",
    ispStatus: "DUE_SOON",
    riskFlag: "STANDARD",
    behaviorSupportLevel: "MODERATE",
    medProfile: "DAILY",
    appointmentLoad: "MODERATE",
    status: "ACTIVE",
  },
  {
    id: "IND-1003",
    name: "Kevin Brown",
    maNumber: "MA-22003",
    age: 42,
    gender: "Male",
    room: "Room 3",
    residentialType: "FULL_TIME_247",
    homeVisitSchedule: "No scheduled home visit",
    housingCoverage: "24/7",
    careRateTier: "LOWER_SHARED",
    ispStatus: "OVERDUE",
    riskFlag: "HIGH",
    behaviorSupportLevel: "INTENSIVE",
    medProfile: "MULTIPLE_DAILY",
    appointmentLoad: "HIGH",
    status: "ACTIVE",
  },
];

export const DEMO_STAFF: StaffRow[] = [
  {
    id: "EMP-1001",
    name: "Anna Smith",
    role: "SUPERVISOR",
    shiftToday: "07:00 - 15:00",
    trainingStatus: "CURRENT",
    medCertified: true,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "ON_DUTY",
  },
  {
    id: "EMP-1002",
    name: "Mike Lee",
    role: "DSP",
    shiftToday: "15:00 - 23:00",
    trainingStatus: "DUE_SOON",
    medCertified: true,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "OFF_DUTY",
  },
  {
    id: "EMP-1003",
    name: "Sara Long",
    role: "DSP",
    shiftToday: "23:00 - 07:00",
    trainingStatus: "OVERDUE",
    medCertified: false,
    cpr: "EXPIRED",
    driver: "INACTIVE",
    clearance: "CURRENT",
    status: "ON_DUTY",
  },
  {
    id: "EMP-1004",
    name: "Dr. Lisa Turner",
    role: "BEHAVIOR_SPECIALIST",
    shiftToday: "Visit 10:30 - 12:00",
    trainingStatus: "CURRENT",
    medCertified: false,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "OFF_DUTY",
  },
];

export const DEMO_COVERAGE: CoverageShift[] = [
  {
    id: "SH-1",
    time: "07:00 - 15:00",
    service: "Residential Support",
    shiftStatus: "IN_PROGRESS",
    staffAssigned: [
      { name: "Anna Smith", role: "Supervisor" },
      { name: "Sara Long", role: "DSP" },
    ],
    individualsCovered: ["John Doe", "Emily Stone"],
    staffingRatioLabel: "2 DSP : 2 Residents",
    behaviorSupport: true,
    note: "Morning routines, medication support, breakfast, laundry setup.",
  },
  {
    id: "SH-2",
    time: "15:00 - 23:00",
    service: "Residential Support",
    shiftStatus: "UPCOMING",
    staffAssigned: [
      { name: "Mike Lee", role: "DSP" },
      { name: "Anna Smith", role: "Supervisor" },
    ],
    individualsCovered: ["All residents"],
    staffingRatioLabel: "2 DSP : 3 Residents",
    note: "Dinner support, appointments follow-up, house routines.",
  },
  {
    id: "SH-3",
    time: "23:00 - 07:00",
    service: "Overnight Awake",
    shiftStatus: "UPCOMING",
    staffAssigned: [
      { name: "Sara Long", role: "DSP" },
      { name: "Temp DSP", role: "DSP" },
      { name: "On-call DSP", role: "DSP" },
    ],
    individualsCovered: ["Kevin Brown"],
    staffingRatioLabel: "3 DSP : 1 High-Need Resident",
    awakeRequired: true,
    behaviorSupport: true,
    note: "High behavioral needs. Awake monitoring required every 60 minutes.",
  },
];

export const DEMO_ALERTS: AlertItem[] = [
  {
    id: "AL-1",
    level: "CRITICAL",
    title: "Overnight high-need resident needs 3-DSP coverage",
    detail:
      "One overnight shift for Kevin Brown requires multi-DSP support; confirm all staff assigned.",
    actionLabel: "Open Staffing",
  },
  {
    id: "AL-2",
    level: "WARNING",
    title: "Medication administration audit due",
    detail:
      "Residential medication documentation should be reviewed this week for daily-use residents.",
    actionLabel: "Open Operations",
  },
  {
    id: "AL-3",
    level: "INFO",
    title: "Behavior specialist home visit today",
    detail:
      "Dr. Lisa Turner scheduled to visit at 10:30 AM for behavior support follow-up.",
    actionLabel: "Open Residents",
  },
];

export const DEMO_COMPLIANCE: ComplianceItem[] = [
  {
    key: "fire",
    label: "Fire Drill",
    score: 88,
    status: "WARNING",
    lastReviewed: "2026-04-02",
  },
  {
    key: "safety",
    label: "Safety & Environment",
    score: 96,
    status: "GOOD",
    lastReviewed: "2026-04-04",
  },
  {
    key: "docs",
    label: "House Documentation",
    score: 74,
    status: "CRITICAL",
    lastReviewed: "2026-03-28",
  },
  {
    key: "training",
    label: "Staff Training",
    score: 82,
    status: "WARNING",
    lastReviewed: "2026-04-01",
  },
  {
    key: "med",
    label: "Medication Documentation",
    score: 94,
    status: "GOOD",
    lastReviewed: "2026-04-05",
  },
  {
    key: "behavior",
    label: "Behavior Support Documentation",
    score: 86,
    status: "WARNING",
    lastReviewed: "2026-04-05",
  },
];

export const DEMO_TIMELINE: TimelineItem[] = [
  {
    id: "TL-1",
    at: "Today 07:05 AM",
    title: "Morning DSP team checked in",
    description: "2 DSP started residential coverage for morning routines.",
    level: "INFO",
  },
  {
    id: "TL-2",
    at: "Today 08:15 AM",
    title: "Breakfast and morning meds completed",
    description: "All active residents received meal support and medication documentation.",
    level: "INFO",
  },
  {
    id: "TL-3",
    at: "Today 10:30 AM",
    title: "Behavior specialist arrived",
    description: "Specialist home visit for intensive behavior support plan.",
    level: "INFO",
  },
  {
    id: "TL-4",
    at: "Yesterday 11:40 PM",
    title: "Awake monitoring warning",
    description: "Overnight shift alert triggered for delayed confirmation.",
    level: "WARNING",
  },
];

export const DEMO_DRILLS: FireDrillRow[] = [
  {
    id: "FD-2001",
    date: "2026-04-01",
    location: "Maple Residential Home",
    drillType: "FIRE",
    shiftTime: "09:00 - 09:20",
    result: "PASS",
    notes: "All residents exited within expected time.",
    source: "MANUAL",
  },
  {
    id: "FD-2002",
    date: "2026-03-14",
    location: "Maple Residential Home",
    drillType: "EVAC",
    shiftTime: "14:00 - 14:25",
    result: "FAIL",
    notes: "Delay due to staff communication gap.",
    source: "MANUAL",
  },
];

export const DEMO_MEALS: MealRow[] = [
  {
    meal: "Breakfast",
    servedBy: "Anna Smith",
    completion: "3 / 3 completed",
    notes: "One resident needed prompting and meal texture adjustment.",
  },
  {
    meal: "Lunch",
    servedBy: "Mike Lee",
    completion: "Planned",
    notes: "Medication coordination needed before lunch.",
  },
  {
    meal: "Dinner",
    servedBy: "Evening DSP Team",
    completion: "Planned",
    notes: "Two residents need direct meal prep support.",
  },
  {
    meal: "Snack",
    servedBy: "Night Shift",
    completion: "Planned",
    notes: "Overnight snack for awake resident support.",
  },
];

export const DEMO_MEDS: MedTaskRow[] = [
  {
    resident: "John Doe",
    schedule: "08:00 AM / 12:00 PM / 08:00 PM",
    status: "DONE",
    notes: "Multiple daily meds documented.",
  },
  {
    resident: "Emily Stone",
    schedule: "09:00 AM",
    status: "DONE",
    notes: "Daily medication completed.",
  },
  {
    resident: "Kevin Brown",
    schedule: "08:00 AM / 02:00 PM / 09:00 PM",
    status: "PENDING",
    notes: "Evening dose needs second staff witness.",
  },
];

export const DEMO_CHORES: ChoreRow[] = [
  {
    task: "Laundry",
    assignedTo: "Morning DSP",
    status: "DONE",
    notes: "2 loads completed.",
  },
  {
    task: "Kitchen cleaning",
    assignedTo: "Evening DSP",
    status: "PENDING",
    notes: "To be completed after dinner.",
  },
  {
    task: "Room organization support",
    assignedTo: "Afternoon DSP",
    status: "PENDING",
    notes: "Resident assistance required.",
  },
];

export const DEMO_APPOINTMENTS: AppointmentRow[] = [
  {
    resident: "John Doe",
    appointmentType: "Psychiatry Follow-up",
    when: "Tomorrow 09:30 AM",
    escort: "Anna Smith",
    status: "SCHEDULED",
  },
  {
    resident: "Emily Stone",
    appointmentType: "Primary Care",
    when: "Completed today 01:00 PM",
    escort: "Mike Lee",
    status: "COMPLETED",
  },
  {
    resident: "Kevin Brown",
    appointmentType: "Neurology Follow-up",
    when: "Next Monday 11:00 AM",
    escort: "TBD",
    status: "FOLLOW_UP",
  },
];

export const DEMO_SPECIALISTS: SpecialistVisitRow[] = [
  {
    resident: "John Doe",
    specialist: "Dr. Lisa Turner",
    focus: "Behavior intervention and staff coaching",
    when: "Today 10:30 AM",
    status: "DONE",
  },
  {
    resident: "Kevin Brown",
    specialist: "Behavior Consultant",
    focus: "Escalation response review",
    when: "Friday 02:00 PM",
    status: "UPCOMING",
  },
];