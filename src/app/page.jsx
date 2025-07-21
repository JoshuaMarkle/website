"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import ProjectsList from "@/components/ProjectList";
import AlgoType from "@/components/projects/AlgoType";
import UvaChatbot from "@/components/projects/UvaChatbot";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const projectComponents = {
  "AlgoType.net": <AlgoType />,
  "UVA Chatbot": <UvaChatbot />,
  // add more here
};

export default function Home() {
  const [view, setView] = useState("left");
  const [selected, setSelected] = useState(null);
  const hasSelection = Boolean(selected);
  const contentRef = useRef(null);
  const isMobile = useIsMobile();

  // Automatically switch view on mobile when selecting a project
  useEffect(() => {
    if (selected && isMobile) {
      setView("right");
    } else if (selected) {
      setView("both");
    }
  }, [selected]);

  // Detect if switch to mobile view
  useEffect(() => {
    if (isMobile && view === "both") {
      setView("right");
    }
  }, [isMobile, view]);

  // Reset scroll to top
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [selected]);

  return (
    <main className="flex flex-row w-screen h-screen p-4 lg:py-8 xl:py-16 transition-all duration-100 overflow-hidden text-lg">
      {/* Left column */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{
          width:
            view === "both"
              ? "50%" // becomes 50% via flex automatically
              : view === "left"
                ? "100%"
                : "0%",
        }}
        className={cn(
          "overflow-y-auto no-scrollbar pl-0 transition-[padding]",
          view !== "right" && "lg:pl-4 xl:pl-12",
        )}
      >
        <div className="h-full w-2xl mx-auto flex flex-col">
          {/* Header + Projects */}
          <div className="flex-grow space-y-8">
            <div className="relative">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-0"
              >
                Hello, I'm Josh
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute top-0 right-0"
              >
                <Image
                  src="/images/wave.png"
                  alt="Wave Emoji"
                  height={128}
                  width={128}
                  className={`size-12 origin-[80%_80%] hover:animate-wave transition-opacity select-none ${view !== "left" ? "opacity-0" : "opacity-0 sm:opacity-100"}`}
                />
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                I'm a software developer and programmer building cool things.
              </motion.p>
            </div>
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-0"
              >
                My Projects
              </motion.h2>
              <ProjectsList onSelect={setSelected} selected={selected} />
            </div>
          </div>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-row items-center gap-2 text-sm text-fg-2 hover:underline"
            href="https://github.com/JoshuaMarkle/website"
            target="_blank"
          >
            <FaGithub /> JoshuaMarkle/website
          </motion.a>
        </div>
      </motion.div>

      {/* Separator */}
      {hasSelection && (
        <div
          className={cn(
            "relative flex items-center justify-center text-fg-3 z-10",
            view === "both" ? "lg:mx-8" : "",
          )}
        >
          {!isMobile && view === "both" && (
            <motion.div layout className="w-[2px] h-full bg-border" />
          )}

          {/* Left toggle button */}
          {view !== "left" && (
            <button
              className={cn(
                "absolute top-1/2 -translate-y-1/2 hover:translate-x-1 rounded-full p-[2px] transition-all",
                isMobile ? "bg-bg border" : " left-0",
                view === "right" && "rotate-180",
              )}
              onClick={() => {
                if (view === "right") {
                  setView(isMobile ? "left" : "both");
                } else {
                  setView("left");
                }
              }}
            >
              <span className="sr-only">Show Left</span>
              <FiChevronRight className="size-6" />
            </button>
          )}

          {/* Right toggle button */}
          {view !== "right" && (
            <button
              className="absolute right-0 top-1/3 -translate-y-1/2 hover:-translate-x-1 rounded-full p-[2px] transition-all"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 hover:-translate-x-1 rounded-full p-[2px] transition-all",
                isMobile ? "bg-bg border" : "right-0",
                view === "left" && "rotate-180",
              )}
              onClick={() => {
                if (view === "left") {
                  setView(isMobile ? "right" : "both");
                } else {
                  setView("right");
                }
              }}
            >
              <span className="sr-only">Show Right</span>
              <FiChevronLeft className="size-6" />
            </button>
          )}
        </div>
      )}

      {/* Right column */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            key="projectContent"
            ref={contentRef}
            initial={{ width: 0, opacity: 0 }}
            exit={{ width: 0, opacity: 0 }}
            animate={{
              width:
                view === "both"
                  ? "100%" // or match flex ratio
                  : view === "right"
                    ? "100%"
                    : "0%",
              opacity: 1,
            }}
            className={cn(
              "overflow-y-auto pr-0 transition-[padding]",
              view !== "left" && "lg:pr-4 xl:pr-12",
            )}
          >
            <div
              className={cn(
                "relative mx-auto",
                view === "left" ? "w-4xl" : "w-full max-w-4xl",
              )}
            >
              {projectComponents[selected] || (
                <p>
                  Content for <strong>{selected}</strong> coming soon!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
