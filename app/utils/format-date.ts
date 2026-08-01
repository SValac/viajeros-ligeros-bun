export function formatDate(dateString: string, locale: string = 'es-MX') {
  return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
