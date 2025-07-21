"use client";

import { motion } from "framer-motion";
import { TiHome } from "react-icons/ti";

export default function PageHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-row justify-between items-center mb-2 text-fg-3"
    >
      <h3 className="m-0">Joshua Markle | Portfolio</h3>
      <a href="/">
        <TiHome className="size-6 hover:text-fg-2/80 transition-all duration-100" />
      </a>
    </motion.header>
  );
}
