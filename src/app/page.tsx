'use client';

import { HiArrowRight, HiDownload } from 'react-icons/hi';
import Button from "@/components/Button"
import ProjectCard from "@/components/ProjectCard"
import MarqueeSine from "@/components/Marquee";
import { useLocomotiveScroll } from '@/components/LocomotiveScrollProvider';

export default function Home() {

	const scroll = useLocomotiveScroll();
	const scrollToProjects = () => {
		const target = document.querySelector('#projects')
		if (scroll) {
			scroll.scrollTo(target, {
				offset: 100,
				duration: 500,
				easing: [0.25, 0.0, 0.35, 1.0],
			});
		}
	};

	return (
		<main>
			<div className="px-8 pt-32 mx-0 md:mx-32 xl:mx-64 h-screen">
				<div>
					<h1 className="text-8xl" data-scroll data-scroll-speed="3">Hi</h1>
					<h2 className="text-8xl" data-scroll data-scroll-speed="3">I&apos;m Josh</h2>
					<p className="text-2xl md:text-4xl mt-4 md:mt-8" data-scroll data-scroll-speed="2">CS Student @ University of Virginia</p>
					<div className="flex row gap-6 mt-8" data-scroll data-scroll-speed="1.5">
						<Button size="lg" className="group" onClick={scrollToProjects}>
							View My Work
							<HiArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
						</Button>
						<Button size="lg" variant="outline">
							<HiDownload className="mr-2 h-5 w-5" />
							Resume
						</Button>
					</div>
				</div>
			</div>
			<div id="projects">
				<MarqueeSine/>
			</div>
			<div className="p-8 mx-0 md:mx-32 xl:mx-64" data-scroll data-scroll-speed="2">
				<ProjectCard title="Milestone" subtitle="2020 to 2024"/>
				<ProjectCard title="Sandwich" subtitle="2024 to 2025"/>
				<ProjectCard title="GECKO" subtitle="2022 to 2024"/>
				<ProjectCard title="AlgoType.net" subtitle="2020 to 2022"/>
			</div>
			<div className="p-8 mx-0 md:mx-32 xl:mx-64">
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
			</div>
		</main>
	);
}
