import MarqueeSine from "@/components/Marquee";

export default function Home() {
	return (
		<main>
			<div className="px-8 pt-32 mx-0 md:mx-32 xl:mx-64 h-screen">
				<div>
					<h1 className="text-8xl">Hi</h1>
					<h2 className="text-8xl">I&apos;m Josh</h2>
					<p className="text-2xl md:text-4xl mt-4 md:mt-16">CS Student @ University of Virginia</p>
				</div>
			</div>
			<MarqueeSine/>
			<div className="p-8 mx-0 md:mx-32 xl:mx-64 mt-16">
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
				<p className="text-4xl mb-16">“I know of no better life purpose than to perish in attempting the great and the impossible.”</p>
			</div>
		</main>
	);
}
