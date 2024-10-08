document.addEventListener('DOMContentLoaded', function () {
	var aboutToggler = document.getElementById('about-toggler');
	var aboutSection = document.getElementById('about');

	aboutToggler.addEventListener('click', function (event) {
		event.preventDefault();
		aboutSection.classList.toggle('expand');
	});

	// Fade in cards
	const observer = new IntersectionObserver((entries, observer) => {
		entries.forEach((entry, index) => {
			if (entry.isIntersecting) {
				let delay = index * 100;
				entry.target.style.transitionDelay = `${delay}ms`;
				entry.target.classList.add('fade-in');
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.1 });

	const cards = document.querySelectorAll('.card');
	cards.forEach((card, index) => observer.observe(card));
});
