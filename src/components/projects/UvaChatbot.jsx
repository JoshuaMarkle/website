"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";

export default function UvaChatbot() {
  return (
    <>
      {/* Text content */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-0"
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
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full aspect-video overflow-hidden ring ring-border rounded-lg shadow-default cursor-pointer mt-8 mb-16"
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

      {/* Technical explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2>How It Works</h2>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p>
          The chatbot combines a conversational model (Gemini/GPT) with a
          Retrieval-Augmented Generation (RAG) pipeline. This gives the chatbot
          access to highly accurate, UVA specific resources, as context to
          produce the most relevant response.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3>The process would look like this:</h3>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p>
          All UVA Career Center documents are first cleaned and turned into
          vectors (numerical representations). These vectors are stored in a{" "}
          <strong>vector database</strong> - special type of database that
          understands meaning.
        </p>
        <p>
          When a student asks a question, the chatbot compares that question to
          all the stored documents and finds the most relevant one. It then
          sends both the question and the matching document to the AI model
          (LLM), which uses the extra context to generate a much more accurate
          and helpful response.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
      >
        <Image
          src="/images/uva_chatbot/rag_flowchart.png"
          alt="RAG flowchart"
          width={2000}
          height={1127}
          className="w-[80%] mx-auto my-16 rounded-lg ring ring-border shadow-default"
        />
      </motion.div>

      {/* Call to Action */}
      <motion.a
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        className="flex flex-row justify-center items-center gap-2 hover:underline"
        href="https://github.com/JoshuaMarkle/chatbot"
        target="_blank"
      >
        <FaGithub /> Checkout The Repo
      </motion.a>
    </>
  );
}
