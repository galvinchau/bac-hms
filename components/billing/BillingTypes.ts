export type BillingTab =
  | "WORKSPACE"
  | "CLAIMS"
  | "DENIALS"
  | "PAYMENTS"
  | "SETTINGS";

export type BillingPayer = "ODP" | "CHC" | "PRIVATE" | "OTHER";

export type BillingClaimStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PAID"
  | "DENIED"
  | "VOID";

export type BillingReadiness =
  | "READY"
  | "REVIEW"
  | "HOLD"
  | "ERROR"
  | "ALREADY_BILLED"
  | "PARTIAL";

export type BillingAuthStatus =
  | "VALID"
  | "MISSING"
  | "EXPIRED"
  | "OVER"
  | "NO_RATE";

export type BillingVisitQuality =
  | "CLEAN"
  | "MISSING_CLOCK"
  | "NO_EVV"
  | "CANCELED"
  | "MANUAL";

export type BillingWorkspaceRow = {
  id: string;
  individualId: string;
  individualName: string;
  maNumber?: string | null;

  payer: BillingPayer;
  program?: string | null;

  serviceCode: string;
  serviceName?: string | null;

  authorizationNumber?: string | null;
  authStatus: BillingAuthStatus;

  periodFrom: string;
  periodTo: string;

  visits: number;
  units: number;
  rate: number;
  amount: number;

  previouslyBilled?: number;
  remainingAuth?: number | null;

  claimNumber?: string | null;

  readiness: BillingReadiness;
  visitQuality: BillingVisitQuality;

  source: "VISITS" | "MANUAL" | "IMPORT";
};

export type BillingClaimRow = {
  id: string;
  claimNumber: string;
  billingDate: string;
  periodFrom: string;
  periodTo: string;

  payer: BillingPayer;
  individualName: string;

  serviceSummary: string;
  units: number;
  amount: number;

  status: BillingClaimStatus;
  submissionDate?: string | null;
  paymentDate?: string | null;
  balance?: number | null;

  source: "WORKSPACE" | "MANUAL" | "IMPORT";
};

export type BillingDenialRow = {
  id: string;
  claimNumber: string;
  individualName: string;
  serviceCode: string;

  deniedUnits: number;
  deniedAmount: number;

  denialCode?: string | null;
  denialReason?: string | null;

  rootCause: "AUTH" | "EVV" | "RATE" | "DUPLICATE" | "OTHER";
  assignedTo?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";

  linkedAuth?: string | null;
  linkedVisit?: string | null;
};

export type BillingPaymentRow = {
  id: string;
  paymentNumber: string;
  receivedDate: string;
  payer: BillingPayer;

  amount: number;
  applied: number;
  unapplied: number;

  claimsCount: number;
  status: "OPEN" | "PARTIAL" | "POSTED";
  referenceNo?: string | null;
};

export type BillingWorkspaceSummary = {
  lines: number;
  visits: number;
  units: number;
  amount: number;
  ready: number;
  review: number;
  error: number;
  alreadyBilled: number;
};

export type BillingClaimsSummary = {
  draft: number;
  submitted: number;
  paid: number;
  denied: number;
  voided: number;
  outstanding: number;
};

export type BillingDenialsSummary = {
  open: number;
  inProgress: number;
  resolved: number;
  deniedUnits: number;
  deniedAmount: number;
};

export type BillingPaymentsSummary = {
  received: number;
  applied: number;
  unapplied: number;
  claimsPaid: number;
  partialPaid: number;
};