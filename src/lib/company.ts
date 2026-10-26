/**
 * The legal entity behind GlowUpp, used by the Terms, Privacy policy, partner
 * terms and footer so the details live in one place.
 *
 * UK law requires a company's website to state its name, registered number,
 * place of registration and registered office.
 */
export const COMPANY_NAME = "GlowUpp LTD";
export const COMPANY_NUMBER = "17533159";
export const COMPANY_JURISDICTION = "England and Wales";
/** Registration number on the ICO register of data protection fee payers. */
export const ICO_REGISTRATION_NUMBER = "ZC282538";
export const REGISTERED_OFFICE = "82A James Carter Road, Mildenhall, IP28 7DE, United Kingdom";

/** "GlowUpp LTD, a company registered in England and Wales (company number 12345678), registered office: ..." */
export function companyLine(): string {
  return `${COMPANY_NAME}, a company registered in ${COMPANY_JURISDICTION} (company number ${COMPANY_NUMBER}), registered office: ${REGISTERED_OFFICE}`;
}
