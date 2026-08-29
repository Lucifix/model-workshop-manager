export interface PaintAvailability {
  totalRequired: number;
  ownedCount: number;
  missingCount: number;
  coveragePercent: number; // 0-100, rounded
}

/**
 * Given a list of booleans (one per required paint, true if that paint is in
 * the user's paint_inventory), computes the availability summary shown on
 * model/project pages (spec §13: "6 / 7 available, 83% paint coverage").
 *
 * Pure function, no DB access — this is the piece explicitly called out for
 * thorough testing in spec §25.
 */
export function paintAvailability(ownedFlags: boolean[]): PaintAvailability {
  const totalRequired = ownedFlags.length;
  const ownedCount = ownedFlags.filter(Boolean).length;
  const missingCount = totalRequired - ownedCount;
  const coveragePercent = totalRequired === 0 ? 100 : Math.round((ownedCount / totalRequired) * 100);
  return { totalRequired, ownedCount, missingCount, coveragePercent };
}
