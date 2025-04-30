"use client";

import React from "react";
import clsx from "clsx";

const sizes = {
  default: "h-10 px-4 py-2",
  lg: "h-11 px-8",
};

const variants = {
  default: "text-white",
  outline: "text-white border border-neutral-500",
};

export default function GlimmerButton({
  icon,
  children,
  size = "default",
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <div className="relative inline-flex items-center justify-center group">
      {/* Glow + border effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="glow-box w-full h-full rounded-md blur-sm" />
        <div className="border-box w-full h-full rounded-md" />
      </div>

      <button
        className={clsx(
          "relative z-10 inline-flex items-center justify-center text-sm font-medium rounded-md transition-all focus:outline-none disabled:pointer-events-none bg-black",
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Icon (not animated) */}
        {icon && <span className="mr-2">{icon}</span>}

        {/* Animated text */}
		<span className="relative block overflow-hidden h-[1.25rem] leading-[1.25rem]">
		  <span className="flex flex-col transition-transform duration-300 ease-in-out group-hover:-translate-y-1/2">
			<span>{children}</span>
			<span aria-hidden="true">{children}</span>
		  </span>
		</span>
      </button>

      {/* Custom keyframe styling */}
      <style jsx>{`
        .border-box,
        .glow-box {
          position: absolute;
          top: -1px;
          left: -1px;
          width: calc(100% + 2px);
          height: calc(100% + 2px);
          overflow: hidden;
          border-radius: 6px;
        }

        .glow-box::before,
        .border-box::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          width: 300%;
          height: 300%;
          background-image: conic-gradient(
            rgba(0, 0, 0, 0),
            white,
            rgba(0, 0, 0, 0) 30%
          );
          background-repeat: no-repeat;
          background-position: center;
          animation: rotate 3s linear infinite;
        }

        .glow-box {
          filter: blur(5px);
        }

        @keyframes rotate {
          100% {
            transform: translate(-50%, -50%) rotate(1turn);
          }
        }
      `}</style>
    </div>
  );
}
