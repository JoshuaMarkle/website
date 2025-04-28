'use client';

export default function ProjectCard({ title = "Project", subtitle = "2020 to 2025", link = "" }) {
	return (
		<a 
			href={link} 
			target="_blank" 
			rel="noopener noreferrer" 
			className="block w-full py-4 px-0 hover:pl-4 transition-all duration-200"
		>
			<h3 className="text-4xl md:text-6xl">{title}</h3>
			<p className="text-2xl text-neutral-500">{subtitle}</p>
		</a>
	);
}
