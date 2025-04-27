import Link from 'next/link';

export default function Navbar() {
	return (
		<nav className="w-full flex items-center justify-between py-4 px-8">
			<div/>
			<div className="space-x-8">
				<Link href="#about" className="hover:text-gray-500 transition">About</Link>
				<Link href="#contact" className="hover:text-gray-500 transition">Say Hi</Link>
			</div>
		</nav>
	)
}
