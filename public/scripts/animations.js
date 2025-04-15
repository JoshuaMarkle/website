// Fade in content
document.addEventListener("DOMContentLoaded", () => {
	const fadeElements = document.querySelectorAll(".fade");

	fadeElements.forEach(el => {
	const startDelay = 200;
	const delay = parseInt(el.dataset.delay, 10) + startDelay || 0;

	setTimeout(() => {
		el.classList.add("in");
	}, delay);
	});
});

// Toggle dark mode
document.addEventListener("DOMContentLoaded", () => {
	const themeButton = document.getElementById("theme-button");
	const root = document.documentElement;

	themeButton.addEventListener("click", () => {
		root.classList.toggle("dark");
	});
});
