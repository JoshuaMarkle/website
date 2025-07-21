"use client";

import { motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";

export default function Home() {
  return (
    <main className="flex flex-row w-screen h-screen p-4 lg:py-8 xl:py-16 transition-all duration-100 overflow-hidden text-lg">
      <div className="h-full w-full max-w-2xl mx-auto flex flex-col">
        <div className="flex-grow space-y-8">
          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-0"
            >
              404
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Sorry, I couldn't find that project for you :(
            </motion.p>
          </div>
          <motion.div
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="w-fit"
          >
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-bg-2 rounded-md px-4 py-3 shadow-subtle"
              href="/"
            >
              Go home
            </motion.a>
          </motion.div>
        </div>
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-row items-center gap-2 text-sm text-fg-2 hover:underline"
          href="https://github.com/JoshuaMarkle/website"
          target="_blank"
        >
          <FaGithub /> JoshuaMarkle/website
        </motion.a>
      </div>
    </main>
  );
}
