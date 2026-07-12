export const FRONT_URL = process.env.E2E_FRONT_URL || 'http://localhost:4257';
export const API_URL = process.env.E2E_API_URL || `${FRONT_URL}/api/v1`;

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@kunk-api.test';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

export const ACOL_EMAIL = process.env.E2E_ACOL_EMAIL || 'acolhimento@kunk-api.test';
export const ACOL_PASSWORD = process.env.E2E_ACOL_PASSWORD || 'TestAcol123!';

export const PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL || 'parceiro@kunk-api.test';
export const PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD || 'TestPartner123!';
