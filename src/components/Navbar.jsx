'use client';

import Link from 'next/link';

export default function Navbar() {
	return (
		<nav className="fixed top-0 w-full flex items-center justify-between py-4 px-8">
			<div/>
			<div className="space-x-8">
				<Link href="#resume" className="hover:text-gray-500 transition">Resume</Link>
			</div>
		</nav>
	)
}
