import { randomInt } from "@flimflam/shared";

export interface WheelSegment {
  type: "cash" | "bankrupt" | "lose-a-turn" | "free-play";
  value: number; // 0 for non-cash
  label: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { type: "cash", value: 500, label: "$500" },
  { type: "cash", value: 550, label: "$550" },
  { type: "cash", value: 600, label: "$600" },
  { type: "cash", value: 650, label: "$650" },
  { type: "cash", value: 700, label: "$700" },
  { type: "cash", value: 800, label: "$800" },
  { type: "cash", value: 900, label: "$900" },
  { type: "cash", value: 2500, label: "$2,500" },
  { type: "bankrupt", value: 0, label: "BANKRUPT" },
  { type: "cash", value: 500, label: "$500" },
  { type: "cash", value: 600, label: "$600" },
  { type: "cash", value: 700, label: "$700" },
  { type: "cash", value: 300, label: "$300" },
  { type: "cash", value: 450, label: "$450" },
  { type: "cash", value: 350, label: "$350" },
  { type: "free-play", value: 500, label: "FREE PLAY" },
  { type: "cash", value: 500, label: "$500" },
  { type: "cash", value: 850, label: "$850" },
  { type: "cash", value: 550, label: "$550" },
  { type: "lose-a-turn", value: 0, label: "LOSE A TURN" },
  { type: "cash", value: 650, label: "$650" },
  { type: "cash", value: 750, label: "$750" },
  { type: "bankrupt", value: 0, label: "BANKRUPT" },
  { type: "cash", value: 400, label: "$400" },
];

export interface SpinResult {
  segment: WheelSegment;
  angle: number;
}

/**
 * Perform a server-authoritative spin.
 * Returns the landing segment and an angle suitable for client-side animation.
 * The angle includes 3-5 full rotations (1080-1800 degrees) plus the landing position.
 */
export function spinWheel(): SpinResult {
  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentIndex = randomInt(segmentCount);
  const segment = WHEEL_SEGMENTS[segmentIndex] ??
    WHEEL_SEGMENTS[0] ?? { type: "cash" as const, value: 500, label: "$500" };

  // Each segment covers (360 / segmentCount) degrees.
  const degreesPerSegment = 360 / segmentCount;
  // Landing angle is the center of the selected segment.
  const landingAngle = segmentIndex * degreesPerSegment + degreesPerSegment / 2;

  // Add 3-5 full rotations for a satisfying spin animation.
  const fullRotations = 3 + randomInt(3); // 3, 4, or 5
  const angle = fullRotations * 360 + landingAngle;

  return { segment, angle };
}
