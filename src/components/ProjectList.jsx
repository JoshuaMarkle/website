"use client";

import { useState } from "react";
import { HiArrowRight } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

const projects = [
  {
    title: "AlgoType.net",
    description: "Typing website for programmers.",
  },
  {
    title: "UVA Chatbot",
    description: "Chatbot for the UVA Career Center",
  },
  {
    title: "Milestone",
    description: "Mobile app for student drivers.",
  },
  {
    title: "Sandwich",
    description: "Browser extension for students.",
  },
  {
    title: "GECKO",
    description: "Keyboard layout optimization.",
  },
];

const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
  hidden: {},
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export default function ProjectList({ onSelect }) {
  const [showAll, setShowAll] = useState(false);
  const baseProjects = projects.slice(0, 3);
  const extraProjects = projects.slice(3);

  const handleClick = (project) => {
    onSelect(project.title);
  };

  return (
    <motion.div
      className="space-y-2"
      initial="hidden"
      animate="visible"
      variants={listVariants}
    >
      {/* Base Projects */}
      {baseProjects.map((project) => (
        <motion.div
          key={project.title}
          variants={itemVariants}
          className="flex flex-row justify-between transition-all duration-300 py-2 rounded-md cursor-pointer group hover:ml-4"
          onClick={() => handleClick(project)}
        >
          <div>
            <h3 className="font-semibold text-lg">{project.title}</h3>
            <p className="text-fg-2 text-md">{project.description}</p>
          </div>
          <HiArrowRight className="hidden md:block size-4 text-fg-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </motion.div>
      ))}

      {/* Extra Projects */}
      <AnimatePresence>
        {showAll &&
          extraProjects.map((project) => (
            <motion.div
              key={project.title}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-row justify-between transition-all duration-300 py-2 rounded-md cursor-pointer group hover:ml-4"
              onClick={() => handleClick(project)}
            >
              <div>
                <h3 className="font-semibold text-lg">{project.title}</h3>
                <p className="text-fg-2 text-md">{project.description}</p>
              </div>
              <HiArrowRight className="hidden md:block size-4 text-fg-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Show more/less button */}
      {extraProjects.length > 0 && (
        <motion.button
          layout
          onClick={() => setShowAll(!showAll)}
          whileHover={{ scale: 1.2 }}
          className="text-sm text-left text-fg-2 hover:underline mt-2"
        >
          {showAll ? "Show less" : `Show ${extraProjects.length} more`}
        </motion.button>
      )}
    </motion.div>
  );
}
