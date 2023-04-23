// Helpful Viewport Function
function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    const val = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    console.log(val);
    return val;
}

// Animate Title
let titleFadedIn = false;
function fadeInTitle() {
    let title = document.getElementById("title");
    setTimeout(function() {
        title.classList.add("fade-in", "show");
        gsap.to(title, { y: 0, opacity: 1, delay: 0 });
    }, 250);
    titleFadedIn = true;
}

function fadeOutTitle() {
    let title = document.getElementById("title");
    gsap.to(title, {
      y: -50,
      opacity: 0,
      duration: 1,
      ease: "power2.out"
    });
    titleFadedIn = false;
  }

// Animate Elements
function fadeInElement(name, delay) {
    let title = document.getElementById(name);
    let titlePosition = title.getBoundingClientRect().top;
    let screenPosition = window.innerHeight;
    if (titlePosition < screenPosition) {
        setTimeout(function() {
            title.classList.add("fade-in", "show");
            gsap.to(title, { opacity: 1, y: 0 });
        }, delay);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    fadeInTitle();
    fadeInElement("title-image", 200);
    fadeInElement("nav-1", 100);
    fadeInElement("nav-2", 200);
    fadeInElement("nav-3", 300);
    fadeInElement("nav-4", 400);
    fadeInElement("nav-5", 200);
    fadeInElement("nav-6", 100);
});

window.addEventListener("scroll", function() {
    let title = document.getElementById("title");
    if (isInViewport(title)) {
        if (!titleFadedIn) {
            fadeInTitle();
        }
    } else {
        if (titleFadedIn) {
            fadeOutTitle();
        }
    }
});

window.addEventListener("scroll", function() {fadeInElement("projects", 250);});

// Animate Containers
function animateContainers() {
    const containers = document.querySelectorAll('.container');
    containers.forEach((container) => {
        const containerPosition = container.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;
        if (containerPosition < screenPosition) {
            setTimeout(function() {
                gsap.to(container, { opacity: 1, y: 0 });
                container.classList.add('animate');
            }, 500);
        }
    });
}

window.addEventListener('scroll', () => {
    animateContainers();
});

const container = document.querySelector('.container');