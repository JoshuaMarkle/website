import Image from "next/image";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { IoGlobeOutline } from "react-icons/io5";

export default function AlgoType() {
  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Text content */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-0"
      >
        AlgoType.net
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        A{" "}
        <a
          href="https://algotype.net"
          target="_blank"
          className="text-blue hover:underline"
        >
          typing website for programmers
        </a>{" "}
        who want to take their programming speed to the next level. It offers a
        minimalistic experience to practice typing symbols that don't get enough
        time under the fingers.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/images/algotype/algotype.png"
          alt="AlgoType.net website screenshot"
          width={2880}
          height={1628}
          className="w-full ring ring-border rounded-lg shadow-default mt-8"
        />
      </motion.div>
      {/* Technical explanation */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2>Why I Built It</h2>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p>
          I've always enjoyed training my typing speed. But I noticed something
          odd - when I was programming, all those hours on typing sites didn't
          matter in the face of an ampersand.
        </p>
        <p>So I built AlgoType to solve that exact problem:</p>
        <blockquote>
          <strong>
            Typing practice that actually translates to programming
          </strong>
        </blockquote>
        <p>
          It started as a tool for myself, and quickly become something I wanted
          to share with the developer community - a place to train on real code,
          algorithms, and syntax.
        </p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h1>How The Typing System Works</h1>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p>
          Designing a good typing test is harder than it seems — especially when
          you're dealing with code. Every user can type differently, make unique
          errors, and edge cases are everywhere.
        </p>
        <p>Here's how I tackled it.</p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h2>How Tests Are Made</h2>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <p>
          Each test is based on a real code file. All the files are first
          grouped into folders by their <code>gamemode</code> and{" "}
          <code>language</code>, forming structured paths like{" "}
          <code>/algorithms/python</code>.
        </p>
        <p>
          A script then scans each directory, <strong>tokenizes</strong> the
          files, and stores the resulting tokens (plus metadata) in a database.
          When a user starts a test, the app pulls in the tokens for that
          specific file and language.
        </p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <h2>Typing Logic</h2>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <p>
          During a typing test, users move through a list of tokens, trying to
          type as accurately and quickly as possible. To track their progress
          and correctness, AlgoType uses two key systems:
        </p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <h3>1. Syntax-Aware Typing</h3>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <p>
          This system understands code structure. It highlights tokens as you
          type and intelligently skips non-essential ones like comments and tab
          characters. It’s what makes AlgoType feel fluid while typing real
          code.
        </p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <h3>2. Word-Aware Typing</h3>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <p>
          This system looks ahead to spaces and newlines — useful for handling
          overflow situations, like when the user mistypes something early in
          the line and it cascades into future tokens.
        </p>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        <h2>Error System</h2>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 }}
      >
        <p>Here is where things get tricky.</p>
        <p>
          Simply ignoring typos would make tests too forgiving. That’s why
          AlgoType uses an <strong>error stack</strong> — a list of incorrect
          characters that the user must correct before moving on.
        </p>
        <p>As you type:</p>
        <ul>
          <li>
            If a character is wrong, it's marked red and pushed to the error
            stack.
          </li>
          <li>
            If the error occurs at the end of a word (like a space), the
            overflow is visually added to the word.
          </li>
          <li>
            Users must fix all errors before progressing past the word or line.
          </li>
        </ul>
        <p>
          This makes error correction intuitive but strict — encouraging
          precision, not just speed.
        </p>
      </motion.section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/images/algotype/algotype_screenshot.png"
          alt="AlgoType.net website screenshot"
          width={2880}
          height={1628}
          className="w-full ring ring-border rounded-lg shadow-default mt-8"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/images/algotype/algotype_screenshot_2.png"
          alt="AlgoType.net website screenshot"
          width={2880}
          height={1628}
          className="w-full ring ring-border rounded-lg shadow-default mt-8"
        />
      </motion.div>
    </div>
  );
}
