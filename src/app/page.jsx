"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectsList from "@/components/ProjectList";
import AlgoType from "@/components/projects/AlgoType";
import Milestone from "@/components/projects/Milestone";
import UvaChatbot from "@/components/projects/UvaChatbot";
import { cn } from "@/lib/utils";

const projectComponents = {
  "AlgoType.net": <AlgoType />,
  Milestone: <Milestone />,
  "UVA Chatbot": <UvaChatbot />,
  // add more here
};

export default function Home() {
  const [selected, setSelected] = useState(null);
  const hasSelection = Boolean(selected);

  return (
    <main className="flex flex-row w-screen h-screen p-4 lg:py-16 transition-all duration-100 overflow-hidden text-lg">
      {/* Left column */}
      <div className="flex-1 lg:px-16 overflow-auto">
        <div className="w-full mx-auto space-y-8 max-w-2xl">
          <div>
            <h1 className="text-3xl font-bold">Hello, I'm Josh</h1>
            <h2>I am a student at UVA</h2>
          </div>
          <ProjectsList onSelect={setSelected} selected={selected} />
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
          className="bg-bg-2 my-auto"
        />
      )}

      {/* Right column */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            key="projectContent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "70%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 1, ease: [0.175, 0.885, 0.32, 1.0] }}
            className="overflow-auto"
          >
            {projectComponents[selected] || (
              <p>Content for {selected} coming soon.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
