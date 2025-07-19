import Image from "next/image";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { IoGlobeOutline } from "react-icons/io5";

export default function AlgoType() {
  return (
    <div className="relative max-w-4xl mx-auto space-y-4">
      {/* Text content */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold"
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
          className="w-full ring ring-border rounded-lg shadow-default mt-8 mb-16"
        />
      </motion.div>
      {/* Technical explanation */}
      <motion.section
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>Why I Built It</h2>
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
        <h1>How The Typing System Works</h1>
        <p>
          Designing a good typing test is harder than it seems — especially when
          you're dealing with code. Every user can type differently, make unique
          errors, and edge cases are everywhere.
        </p>
        <p>Here’s how I tackled it:</p>
        <h2>How Tests Are Made</h2>
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
        <h2>Typing Logic</h2>
        <p>
          During a test, the user starts at the beginning of the tokens and must
          type their way through to the end as fast as they can. AlgoType uses a
          dual system to keep track of the current position within the tokens.
        </p>
        <p>
          First it has a <strong>syntax-aware typing system</strong> that is
          aware of tokens as the user types. This system allows the typing test
          to highlight code and skip certain tokens (like comments and tabs).
        </p>
        <p>
          Second, it has a <strong>word-aware typing system</strong> where it
          knows how many characters until the next <u>space</u> or{" "}
          <u>newline</u>. This is necessary when the user makes many errors and
          the error stack overflows onto the next token.
        </p>
        <h2>Error System</h2>
        <p>This is the section that has all of the edge cases.</p>
        <p>
          It would be very easy to just ignore incorrect characters but then the
          user wouldn't have to backspace and fix their misktake!
        </p>
        <p>
          To keep track of errors, we have to use a <strong>stack</strong> of
          incorrect chars (the error stack).
        </p>
        <p>
          When the user types, something wrong, they must go back and fix that
          error before they can continue. But what should it <u>look like</u>? A
          good system would make it easy for the user to see what they need to
          fix but at the same time keep track of what they need to type.
        </p>
        <h3>What AlgoType Does</h3>
        <p>
          As a user makes an error, it will mark the current character incorrect
          (red) and move the cursor forward. But if the current character is a
          space (end of word), then we need to make a new stack of incorrect
          characters that overflowed from the current word. This overflow stack
          is added to the end of the current word (in red).
        </p>
        <p>
          If the user is at the end of the word or line, then they can only move
          forwards if they fix all of their mistakes.
        </p>
      </motion.section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/images/algotype/algotype_screenshot.png"
          alt="AlgoType.net website screenshot"
          width={2880}
          height={1628}
          className="w-full ring ring-border rounded-lg shadow-default my-8"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/images/algotype/algotype_screenshot_2.png"
          alt="AlgoType.net website screenshot"
          width={2880}
          height={1628}
          className="w-full ring ring-border rounded-lg shadow-default mt-8 mb-16"
        />
      </motion.div>
    </div>
  );
}
