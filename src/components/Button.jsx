"use client"

import React from 'react';
import clsx from 'clsx';

const sizes = {
	default: 'h-10 px-4 py-2',
	lg: 'h-11 px-8',
};

const variants = {
	default: 'bg-white text-black',
	outline: 'border border-neutral-800 text-white bg-black hover:bg-neutral-800',
};

export default function Button({ children, size = 'default', variant = 'default', className = '', ...props }) {
	return (
		<button
		className={clsx(
			'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus:outline-none disabled:pointer-events-none',
			sizes[size],
			variants[variant],
			className
		)}
		{...props}
		>
		{children}
		</button>
	);
}
