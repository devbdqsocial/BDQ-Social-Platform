import type { LegalDocCategory, LegalDocAudience } from "@prisma/client";

export const CATEGORY_LABEL: Record<LegalDocCategory, string> = {
  TERMS: "Terms",
  PRIVACY: "Privacy",
  DATA_POLICY: "Data policy",
  EVENT_RULES: "Event rules",
  EVENT_POLICY: "Event policy",
  CONTRACT: "Contract",
  GUIDELINES: "Guidelines",
  OTHER: "Other",
};

export const AUDIENCE_LABEL: Record<LegalDocAudience, string> = {
  PUBLIC: "Public",
  CUSTOMER: "Customers",
  VENDOR: "Vendors",
};
