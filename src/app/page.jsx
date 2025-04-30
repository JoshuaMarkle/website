'use client';

import { useEffect } from 'react';
import { HiArrowRight, HiDownload } from 'react-icons/hi';
import Button from "@/components/Button";
import GlimmerButton from "@/components/GlimmerButton"
import ProjectCard from "@/components/ProjectCard";
import MarqueeSine from "@/components/Marquee";
import { useLocomotiveScroll } from '@/components/LocomotiveScrollProvider';

export default function Home() {
	const scroll = useLocomotiveScroll();
	function scrollToProjects() {
		const target = document.querySelector('#projects');
		if (target && scroll) {
			scroll.scrollTo(target.offsetTop, {
				offset: 100,
				duration: 500,
				smooth: 'easeInOutQuart',
			});
		}
	}

	return (
		<main>
			<div className="px-8 pt-32 mx-0 md:mx-32 xl:mx-64 h-screen">
				<div>
					<h1 className="text-8xl" data-scroll data-scroll-speed="3">Hi</h1>
					<h2 className="text-8xl" data-scroll data-scroll-speed="3">I'm Josh</h2>
					<p className="text-2xl md:text-4xl mt-4 md:mt-8" data-scroll data-scroll-speed="2">
						CS Student @ University of Virginia
					</p>
					<div className="flex row gap-6 mt-8" data-scroll data-scroll-speed="1.5">
						<Button size="lg" className="group" onClick={scrollToProjects}>
							View My Work
							<HiArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
						</Button>
						<a href="/JoshuaMarkleResume.pdf" target="_blank" rel="noopener noreferrer">
							<GlimmerButton size="lg" variant="outline" icon={<HiDownload className="mr-2 h-5 w-5" />}>
								Resume
							</GlimmerButton>
						</a>
					</div>
				</div>
			</div>
			<div id="projects">
				<MarqueeSine />
			</div>
			<div className="p-8 mx-0 md:mx-32 xl:mx-64 mt-16" data-scroll data-scroll-speed="2">
				<ProjectCard title="Milestone" subtitle="2020 to 2024" link="https://play.google.com/store/apps/details?id=com.joshuamarkle.milestone&hl=en" />
				<ProjectCard title="Sandwich" subtitle="2024 to 2025" link="https://github.com/JoshuaMarkle/sandwich" />
				<ProjectCard title="GECKO" subtitle="2022 to 2024" link="https://github.com/JoshuaMarkle/keyboard-optimization" />
				<ProjectCard title="AlgoType.net" subtitle="2020 to 2022" link="https://github.com/JoshuaMarkle/algotype" />
			</div>
			<div className="p-8 mt-32 mb-16 mx-0 md:mx-32 xl:mx-64">
				<p className="text-4xl mb-16">
					“I know of no better life purpose than to perish in attempting the great and the impossible.”
				</p>
			</div>
		</main>
	);
}
