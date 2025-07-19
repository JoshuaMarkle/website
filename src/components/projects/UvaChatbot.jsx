"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function UvaChatbot() {
  return (
    <div className="relative min-h-screen max-w-4xl mx-auto space-y-4">
      {/* Text content */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold"
      >
        UVA Career Center Chatbot
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        An AI-driven chatbot that helps University of Virginia students find
        career resources, schedule appointments, and get answers to common
        questions.
      </motion.p>

      {/* Video preview */}
      <motion.div
        layoutId="chatbot-video"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        className="w-full aspect-video overflow-hidden ring ring-border rounded-lg shadow-[0_12px_64px_rgba(0,0,0,.1)] cursor-pointer my-8"
      >
        <video
          src="/videos/uva_chatbot.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        This project uses a RAG archetecture to find relavant context across
        university documents in order to provide users with the most relavant
        responses.
      </motion.p>
    </div>
  );
}
