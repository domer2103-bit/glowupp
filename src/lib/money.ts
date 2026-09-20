/** Money is stored as integer pence in the database (see prisma/schema.prisma) to avoid floating-point rounding. These convert at the UI boundary, where humans think in pounds. */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: number): number {
  return pence / 100;
}

export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    penceToPounds(pence)
  );
}
