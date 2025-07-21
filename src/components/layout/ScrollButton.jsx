"use client";

import { FiChevronUp } from "react-icons/fi";

import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollButton } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

export default function ScrollButton() {
  const isMobile = useIsMobile();
  const showScrollButton = useScrollButton();
  const show = !isMobile && showScrollButton;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-8 right-8 p-2 border border-fg-3 rounded-full transition-all",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      <FiChevronUp className="size-6 text-fg-2" />
    </button>
  );
}
