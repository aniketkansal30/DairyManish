// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const API = process.env.REACT_APP_API_URL || "/api";

export const DEFAULT_CATS = ["Sweets", "Snacks", "Tandoor"];

export const CAT_ICONS = {
  Sweets: "🍬",
  Snacks: "🥨",
  Tandoor: "🔥",
  All: "🏪",
  Dahi: "🥛",
  "Dry Fruit Thal": "🎁",
  "Extra Items": "➕",
  Amul: "🧈",
  Cookies: "🍪",
  GHEWAR: "🍮",
  GUNJIA: "🥟",
  Kachori: "🫓",
  Paneer: "🧀",
  Milk: "🥛",
  Namkeen: "🧂",
  Other: "📦",
  "Gravy Items": "🍛",
};

export const CAT_COLORS = {
  Sweets: "#ec4899",
  Snacks: "#f59e0b",
  Tandoor: "#ef4444",
};
export const VARIATION_PRESETS = [
  { name: "Half / Full", labels: ["Half", "Full"] },
  { name: "Small / Big", labels: ["Small", "Big"] },
  { name: "Small / Medium / Large", labels: ["Small", "Medium", "Large"] },
  { name: "Regular / Large", labels: ["Regular", "Large"] },
  { name: "Single / Double", labels: ["Single", "Double"] },
  { name: "250g / 500g / 1kg", labels: ["250 g", "500 g", "1 kg"] },
  { name: "Cake 500g / 1kg / 2kg", labels: ["500 g", "1 kg", "2 kg"] },
  { name: "1 Pc / 6 Pc / Dozen", labels: ["1 Pc", "6 Pc", "Dozen"] },
  { name: "Milk 250ml / 500ml / 1L", labels: ["250 ml", "500 ml", "1 L"] },
  { name: "Mini / Standard / Premium Box", labels: ["Mini Box", "Standard Box", "Premium Box"] },
  { name: "Small / Medium / Family Pack", labels: ["Small Pack", "Medium Pack", "Family Pack"] },
];