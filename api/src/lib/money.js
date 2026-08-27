// Input is validated to at most 2 decimal places. Parses the digits instead of
// multiplying by 100, which is inexact: 1.005 * 100 is 100.49999999999999.
export function toCents(value) {
  const [whole, fraction = ''] = String(value).trim().split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}
