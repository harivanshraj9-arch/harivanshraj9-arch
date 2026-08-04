/** Convert INR amount to Indian words (Lakh/Crore format). */
export function amountToWords(amount) {
  const n = Math.round(Number(amount || 0) * 100) / 100;
  if (isNaN(n)) return "";
  if (n === 0) return "Zero Rupees Only";
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (v) => v < 20 ? ones[v] : `${tens[Math.floor(v / 10)]}${v % 10 ? " " + ones[v % 10] : ""}`;
  const threeDigits = (v) => {
    const h = Math.floor(v / 100), r = v % 100;
    return (h ? ones[h] + " Hundred" + (r ? " and " : "") : "") + (r ? twoDigits(r) : "");
  };
  const inWords = (v) => {
    if (v === 0) return "";
    let s = "";
    const crore = Math.floor(v / 10000000); v %= 10000000;
    const lakh = Math.floor(v / 100000); v %= 100000;
    const thou = Math.floor(v / 1000); v %= 1000;
    if (crore) s += twoDigits(crore) + " Crore ";
    if (lakh) s += twoDigits(lakh) + " Lakh ";
    if (thou) s += twoDigits(thou) + " Thousand ";
    if (v) s += threeDigits(v);
    return s.trim();
  };
  let result = "Rupees " + inWords(rupees);
  if (paise > 0) result += " and " + twoDigits(paise) + " Paise";
  return result.replace(/\s+/g, " ").trim() + " Only";
}
