"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa";

import ProjectsList from "@/components/ProjectList";
import AlgoType from "@/components/projects/AlgoType";
import UvaChatbot from "@/components/projects/UvaChatbot";
import { cn } from "@/lib/utils";

const projectComponents = {
  "AlgoType.net": <AlgoType />,
  "UVA Chatbot": <UvaChatbot />,
  // add more here
};

export default function Home() {
  const [view, setView] = (useState < "both") | "left" | ("right" > "both");
  const [selected, setSelected] = useState(null);
  const hasSelection = Boolean(selected);
  const contentRef = useRef(null);

  // Automatically switch view on mobile when selecting a project
  useEffect(() => {
    if (selected && window.innerWidth < 1024) {
      setView("right");
    }
  }, [selected]);

  // Reset scroll to top
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [selected]);

  return (
    <main className="flex flex-row w-screen h-screen p-4 lg:py-16 transition-all duration-100 overflow-hidden text-lg">
      {/* Left column */}
      <div className="flex-1 lg:px-16 overflow-auto">
        <div className="w-full h-full flex flex-col mx-auto max-w-2xl">
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
                  className={`size-12 origin-[80%_80%] hover:animate-wave transition-opacity ${hasSelection ? "opacity-0" : "opacity-100"}`}
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
          >
            <FaGithub /> JoshuaMarkle/website
          </motion.a>
        </div>
      </div>

      {/* Separator */}
      {hasSelection && (
        <motion.div
          layout
          initial={{ height: 0 }}
          animate={{ width: 2, height: "100%" }}
          exit={{ height: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-bg xl:bg-bg-2 my-auto"
        />
      )}

      {/* Right column */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            key="projectContent"
            ref={contentRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "70%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 1, ease: [0.175, 0.885, 0.32, 1.0] }}
            className="overflow-auto"
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
