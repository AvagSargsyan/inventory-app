// Integer arithmetic, mirroring the API's toCents: dividing by 100 would put a
// binary float between the stored cents and what the user reads.
export function formatPrice(cents) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100).toLocaleString("en-US");
  return `${sign}$${whole}.${String(absolute % 100).padStart(2, "0")}`;
}
