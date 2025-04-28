import React from "react";

const GridBackground = () => {
	return (
		<div className="absolute w-full h-screen -translate-y-[51vh] -z-10 overflow-hidden bg-black">
			{/* Grid pattern */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
			
			{/* Circular vignette effect */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_100%)]" />
		</div>
	);
};

export default GridBackground;
