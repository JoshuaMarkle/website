// Animate Title
document.addEventListener("DOMContentLoaded", function() {
    fadeInTitle();
});

function fadeInTitle() {
    let title = document.getElementById("title");
    setTimeout(function() {
        title.classList.add("fade-in", "show");
    }, 250);
}



// Animate Elements
function fadeInElement(name) {
    let title = document.getElementById(name);
    let titlePosition = title.getBoundingClientRect().top;
    let screenPosition = window.innerHeight;
    if (titlePosition < screenPosition) {
        setTimeout(function() {
            title.classList.add("fade-in", "show");
        }, 250);
    }
}

window.addEventListener("scroll", function() {fadeInElement("projects");});



// Animate Containers
function animateContainers() {
    const containers = document.querySelectorAll('.container');
    containers.forEach((container) => {
        const containerPosition = container.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;
        if (containerPosition < screenPosition) {
            gsap.to(container, { opacity: 1, y: 0});
            container.classList.add('animate');
        }
    });
}

window.addEventListener('scroll', () => {
    animateContainers();
});

const container = document.querySelector('.container');

// Initialize the tween to set the initial scale
gsap.set(container, { scale: 1 });

// Create the tween to animate the scale on hover
const hoverTween = gsap.to(container, {
  scale: 1.2,
  duration: 0.3,
});

// Add the mouseenter and mouseleave events
container.addEventListener('mouseenter', () => {
  hoverTween.play();
});

container.addEventListener('mouseleave', () => {
  hoverTween.reverse();
});