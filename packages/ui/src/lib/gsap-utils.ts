import gsap from "gsap";
import type { RefObject } from "react";

/**
 * Creates a GSAP timeline scoped to a container ref.
 * The timeline is auto-killed when the component unmounts (via useGSAP cleanup).
 */
export function createScopedTimeline(
  containerRef: RefObject<HTMLElement | null>,
  vars?: gsap.TimelineVars,
): gsap.core.Timeline {
  const tl = gsap.timeline({
    ...vars,
    defaults: { ease: "power2.out", ...vars?.defaults },
  });

  // Scope all selectors to the container
  if (containerRef.current) {
    tl.vars.data = containerRef.current;
  }

  return tl;
}

/**
 * If reduced motion is active, skip the timeline and apply the fallback
 * (typically an instant state set). Returns the timeline or null.
 */
export function withReducedMotion(
  tl: gsap.core.Timeline,
  isReduced: boolean,
  fallback: () => void,
): gsap.core.Timeline | null {
  if (isReduced) {
    tl.kill();
    fallback();
    return null;
  }
  return tl;
}
