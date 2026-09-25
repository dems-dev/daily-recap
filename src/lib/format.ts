const intlLocale = (locale: string) => (locale === "id" ? "id-ID" : "en-US");

export function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(intlLocale(locale))}`;
  }
}

/** Short form for chart axes: 1.5 jt / 1.5M. */
export function formatCompact(amount: number, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
