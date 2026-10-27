import { useEffect, useState } from "react";

/**
 * Which way is the page moving?
 *
 *   const { direction, hidden, atTop } = useScrollDirection();
 *
 * `hidden` is the navbar's cue to step out of the way: scrolling down means
 * "I am reading", scrolling up means "I want the menu back". Two rules keep it
 * from twitching:
 *
 *  - a movement smaller than `threshold` is ignored, so a trackpad's jitter
 *    cannot flip the state back and forth;
 *  - the state object only changes when one of its three values does, so
 *    scrolling does not re-render the navbar sixty times a second.
 *
 * The listener is passive and coalesced into a single animation frame, which
 * is the difference between a smooth page and a stuttering one on a phone.
 */
export default function useScrollDirection({ threshold = 8, hideAfter = 160 } = {}) {
  const [state, setState] = useState({ direction: "up", hidden: false, atTop: true });

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      if (Math.abs(delta) < threshold) return;
      last = y;

      const direction = delta > 0 ? "down" : "up";
      const next = {
        direction,
        hidden: direction === "down" && y > hideAfter,
        atTop: y < 24,
      };

      setState((prev) =>
        prev.direction === next.direction &&
        prev.hidden === next.hidden &&
        prev.atTop === next.atTop
          ? prev
          : next
      );
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold, hideAfter]);

  return state;
}
