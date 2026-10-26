"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Phones: a slim bar under the top bar that slides in once `target` (e.g. the summary card) scrolls out of view */
export function StickyBar({ target, children }: { target: HTMLElement | null; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(target);
    return () => io.disconnect();
  }, [target]);
  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 top-14 z-40 border-b bg-background/95 px-4 py-2 backdrop-blur transition-transform duration-200 md:top-16 lg:hidden",
        show ? "translate-y-0" : "pointer-events-none -translate-y-[200%]"
      )}
    >
      {children}
    </div>
  );
}
