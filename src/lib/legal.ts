/**
 * Single source for legal-entity details referenced across the policy pages. Replace every
 * [BRACKETED] value with the real registered details before go-live, and have counsel review.
 */
export const LEGAL = {
  brand: "BDQ Social",
  entity: "[LEGAL ENTITY NAME]",
  email: "[SUPPORT EMAIL]",
  phone: "[SUPPORT PHONE]",
  address: "[REGISTERED ADDRESS], Vadodara, Gujarat, India",
  grievanceOfficer: "[GRIEVANCE OFFICER NAME]",
  grievanceEmail: "[GRIEVANCE EMAIL]",
  jurisdiction: "Vadodara, Gujarat, India",
  lastUpdated: "5 June 2026",
} as const;
