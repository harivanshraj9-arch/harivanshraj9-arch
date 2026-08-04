export const inr = (n) => {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

export const shortInr = (n) => {
  const num = Number(n || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
