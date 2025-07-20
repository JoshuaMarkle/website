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
    <main className="flex flex-row w-screen h-screen p-4 lg:py-16 transition-all duration-100 overflow-hidden text-lg">
      {/* Left column */}
      <motion.div
        animate={{
          width:
            view === "both"
              ? "50%" // becomes 50% via flex automatically
              : view === "left"
                ? "100%"
                : "0%",
        }}
        className="overflow-hidden"
      >
        {/*<div className="flex-1 lg:px-16 overflow-auto">*/}
        <div className="h-full w-full max-w-2xl mx-auto flex flex-col">
          {/* Header + Projects */}
          <div className="flex-grow space-y-12">
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
                  className={`size-12 origin-[80%_80%] hover:animate-wave transition-opacity select-none ${hasSelection ? "opacity-0" : "opacity-100"}`}
                />
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                I am a software developer and programmer
              </motion.p>
            </div>
            <ProjectsList onSelect={setSelected} selected={selected} />
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
        <div className="relative flex items-center justify-center text-fg-3 z-10">
          {!isMobile && view === "both" && (
            <motion.div layout className="w-1 h-full bg-border" />
          )}

          {/* Left toggle button */}
          {view !== "left" && (
            <button
              className="absolute left-3/2 top-1/2 -translate-y-1/2 bg-bg hover:translate-x-1 rounded-full p-[2px] transition-all"
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
              className="absolute right-3/2 top-1/2 -translate-y-1/2 bg-bg hover:-translate-x-1 rounded-full p-[2px] transition-all"
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
              "mx-auto overflow-auto",
              hasSelection ? "block" : "hidden",
            )}
          >
            {projectComponents[selected] || (
              <p className="w-full max-w-4xl mx-auto">
                Content for <strong>{selected}</strong> coming soon!
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
