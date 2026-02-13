/**
 * Hardcoded colors per pick rank – guaranteed readable on white/light backgrounds
 * regardless of the user's team theme.
 */
export const PICK_RANK_COLORS = [
  // 1st choice - emerald
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", badge: "bg-emerald-500", dot: "text-emerald-600" },
  // 2nd choice - amber
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-500", dot: "text-amber-600" },
  // 3rd choice - blue
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", badge: "bg-blue-500", dot: "text-blue-600" },
  // 4th choice - purple
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300", badge: "bg-purple-500", dot: "text-purple-600" },
  // 5th choice - rose
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300", badge: "bg-rose-500", dot: "text-rose-600" },
];

export function getPickColor(index: number) {
  return PICK_RANK_COLORS[index] || PICK_RANK_COLORS[PICK_RANK_COLORS.length - 1];
}
