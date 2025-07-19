"use client";

import { useEffect, useState, useRef } from "react";
import { FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const projects = [
  { title: "UVA Chatbot", description: "Chatbot for the UVA Career Center" },
  { title: "AlgoType.net", description: "Typing website for programmers." },
  { title: "Milestone", description: "Mobile app for student drivers." },
  { title: "Sandwich", description: "Browser extension for students." },
  { title: "GECKO", description: "Keyboard layout optimization." },
];

const baseListVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.4,
      staggerChildren: 0.15,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.15,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export default function ProjectList({ onSelect }) {
  const [showAll, setShowAll] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const baseProjects = projects.slice(0, 3);
  const extraProjects = projects.slice(3);
  const [firstRender, setFirstRender] = useState(true);

  const handleClick = (project) => {
    onSelect(project.title);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirstRender(false);
    }, 800);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <motion.div layout>
      {/* Base Projects */}
      <motion.div
        variants={baseListVariants}
        initial="hidden"
        animate="visible"
        layout
      >
        {baseProjects.map((project) => (
          <motion.div
            layout
            key={project.title}
            variants={itemVariants}
            className="flex flex-row justify-between rounded-md cursor-pointer group"
            onClick={() => handleClick(project)}
          >
            <div className="py-2 group-hover:ml-4 transition-margin duration-300">
              <h3 className="my-0">{project.title}</h3>
              <p className="text-fg-2 mb-0">{project.description}</p>
            </div>
            <FaChevronRight className="hidden md:block my-auto size-5 text-fg-3 opacity-0 group-hover:opacity-100 transition-all duration-200" />
          </motion.div>
        ))}
      </motion.div>

      {/* Animated Expandable Section */}
      <AnimatePresence
        onExitComplete={() => {
          setShowContent(false);
        }}
      >
        {showAll && (
          <motion.div
            layout
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={listVariants}
            className="overflow-hidden"
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {extraProjects.map((project) => (
              <motion.div
                layout
                key={project.title}
                variants={itemVariants}
                className="flex flex-row justify-between rounded-md cursor-pointer group"
                onClick={() => handleClick(project)}
              >
                <div className="py-2 group-hover:ml-4 transition-margin duration-300">
                  <h3 className="my-0">{project.title}</h3>
                  <p className="text-fg-2 mb-0">{project.description}</p>
                </div>
                <FaChevronRight className="hidden md:block my-auto size-5 text-fg-3 opacity-0 group-hover:opacity-100 transition-all duration-200" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {extraProjects.length > 0 && (
        <motion.button
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: firstRender ? 0.8 : 0,
            duration: 0.15,
            ease: "easeOut",
          }}
          onClick={() => {
            if (showAll) {
              setShowAll(false);
            } else {
              setShowContent(true);
              setShowAll(true);
            }
          }}
          whileHover={{ scale: 1.05 }}
          className="text-sm text-left text-fg-2 hover:underline underline-offset-5 mt-2"
        >
          {showAll ? "Show less" : `Show ${extraProjects.length} more`}
        </motion.button>
      )}
    </motion.div>
  );
}
