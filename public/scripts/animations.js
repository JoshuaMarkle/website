document.addEventListener('DOMContentLoaded', function () {
	var aboutToggler = document.getElementById('about-toggler');
	var aboutSection = document.getElementById('about');

	aboutToggler.addEventListener('click', function (event) {
		event.preventDefault();
		aboutSection.classList.toggle('expand');
	});
});
