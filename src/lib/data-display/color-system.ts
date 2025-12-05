/**
 * Centralized badge color system
 * Used by formatters and column configs for consistent badge styling
 *
 * Soft, elegant color palette with refined depth and modern sophistication
 */
export const BADGE_COLORS = {
  blue: "bg-blue-300/90 text-blue-950 hover:bg-blue-400 focus:bg-blue-400 focus:ring-2 focus:ring-blue-500/50 shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/20 backdrop-blur-sm",
  red: "bg-red-300/90 text-red-950 hover:bg-red-400 focus:bg-red-400 focus:ring-2 focus:ring-red-500/50 shadow-sm shadow-red-500/10 hover:shadow-md hover:shadow-red-500/20 backdrop-blur-sm",
  green:
    "bg-green-300/90 text-green-950 hover:bg-green-400 focus:bg-green-400 focus:ring-2 focus:ring-green-500/50 shadow-sm shadow-green-500/10 hover:shadow-md hover:shadow-green-500/20 backdrop-blur-sm",
  indigo:
    "bg-indigo-300/90 text-indigo-950 hover:bg-indigo-400 focus:bg-indigo-400 focus:ring-2 focus:ring-indigo-500/50 shadow-sm shadow-indigo-500/10 hover:shadow-md hover:shadow-indigo-500/20 backdrop-blur-sm",
  lime: "bg-lime-300/90 text-lime-950 hover:bg-lime-400 focus:bg-lime-400 focus:ring-2 focus:ring-lime-500/50 shadow-sm shadow-lime-500/10 hover:shadow-md hover:shadow-lime-500/20 backdrop-blur-sm",
  teal: "bg-teal-300/90 text-teal-950 hover:bg-teal-400 focus:bg-teal-400 focus:ring-2 focus:ring-teal-500/50 shadow-sm shadow-teal-500/10 hover:shadow-md hover:shadow-teal-500/20 backdrop-blur-sm",
  cyan: "bg-cyan-300/90 text-cyan-950 hover:bg-cyan-400 focus:bg-cyan-400 focus:ring-2 focus:ring-cyan-500/50 shadow-sm shadow-cyan-500/10 hover:shadow-md hover:shadow-cyan-500/20 backdrop-blur-sm",
  yellow:
    "bg-yellow-300/90 text-yellow-950 hover:bg-yellow-400 focus:bg-yellow-400 focus:ring-2 focus:ring-yellow-500/50 shadow-sm shadow-yellow-500/10 hover:shadow-md hover:shadow-yellow-500/20 backdrop-blur-sm",
  rose: "bg-rose-300/90 text-rose-950 hover:bg-rose-400 focus:bg-rose-400 focus:ring-2 focus:ring-rose-500/50 shadow-sm shadow-rose-500/10 hover:shadow-md hover:shadow-rose-500/20 backdrop-blur-sm",
  sky: "bg-sky-300/90 text-sky-950 hover:bg-sky-400 focus:bg-sky-400 focus:ring-2 focus:ring-sky-500/50 shadow-sm shadow-sky-500/10 hover:shadow-md hover:shadow-sky-500/20 backdrop-blur-sm",
  orange:
    "bg-orange-300/90 text-orange-950 hover:bg-orange-400 focus:bg-orange-400 focus:ring-2 focus:ring-orange-500/50 shadow-sm shadow-orange-500/10 hover:shadow-md hover:shadow-orange-500/20 backdrop-blur-sm",
  stone:
    "bg-stone-300/90 text-stone-950 hover:bg-stone-400 focus:bg-stone-400 focus:ring-2 focus:ring-stone-500/50 shadow-sm shadow-stone-500/10 hover:shadow-md hover:shadow-stone-500/20 backdrop-blur-sm",
  amber:
    "bg-amber-300/90 text-amber-950 hover:bg-amber-400 focus:bg-amber-400 focus:ring-2 focus:ring-amber-500/50 shadow-sm shadow-amber-500/10 hover:shadow-md hover:shadow-amber-500/20 backdrop-blur-sm",
  emerald:
    "bg-emerald-300/90 text-emerald-950 hover:bg-emerald-400 focus:bg-emerald-400 focus:ring-2 focus:ring-emerald-500/50 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/20 backdrop-blur-sm",
  fuchsia:
    "bg-fuchsia-300/90 text-fuchsia-950 hover:bg-fuchsia-400 focus:bg-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/50 shadow-sm shadow-fuchsia-500/10 hover:shadow-md hover:shadow-fuchsia-500/20 backdrop-blur-sm",
  violet:
    "bg-violet-300/90 text-violet-950 hover:bg-violet-400 focus:bg-violet-400 focus:ring-2 focus:ring-violet-500/50 shadow-sm shadow-violet-500/10 hover:shadow-md hover:shadow-violet-500/20 backdrop-blur-sm",
  purple:
    "bg-purple-300/90 text-purple-950 hover:bg-purple-400 focus:bg-purple-400 focus:ring-2 focus:ring-purple-500/50 shadow-sm shadow-purple-500/10 hover:shadow-md hover:shadow-purple-500/20 backdrop-blur-sm",
  pink: "bg-pink-300/90 text-pink-950 hover:bg-pink-400 focus:bg-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-sm shadow-pink-500/10 hover:shadow-md hover:shadow-pink-500/20 backdrop-blur-sm",
  gray: "bg-gray-300/90 text-gray-950 hover:bg-gray-400 focus:bg-gray-400 focus:ring-2 focus:ring-gray-500/50 shadow-sm shadow-gray-500/10 hover:shadow-md hover:shadow-gray-500/20 backdrop-blur-sm",
} as const;

export type BadgeColor = keyof typeof BADGE_COLORS;

/**
 * Get badge color class from color key
 * @param color - Color key from BADGE_COLORS
 * @returns Tailwind CSS class string for the badge
 */
export function getBadgeColorClass(color: BadgeColor): string {
  return BADGE_COLORS[color] || BADGE_COLORS.gray;
}
