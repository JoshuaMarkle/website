// Animate Elements
function fadeInElement(name, single, customy = 0) {
    let title = document.getElementById(name + "-title");
    let content = document.getElementById(name + "-content")
    if (single) {
        title = document.getElementById(name);
    }
    if (title == null) {
        return;
    }
    let titlePosition = title.getBoundingClientRect().top;
    let screenPosition = window.innerHeight;
    if (titlePosition < screenPosition - 150) {
        setTimeout(function() {
            title.classList.add("fade-in", "show");
            gsap.to(title, { opacity: 1, y: customy });
        }, 250);
        if (!single) {
            setTimeout(function() {
                title.classList.add("fade-in", "show");
                gsap.to(content, { opacity: 1, y: customy });
            }, 350);
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // fadeInElement("title", true)
    // fadeInElement("title-image", true);
    fadeInElement("banner", true, 250);
    fadeInElement("contact-form", true);

    fadeInElement("nav-1", true);
    fadeInElement("nav-2", true);
    fadeInElement("nav-3", true);
    fadeInElement("nav-4", true);
    fadeInElement("nav-5", true);
    fadeInElement("nav-6", true);

    for (let i = 0; i < 20; i++) {
        if (document.getElementById("content" + i) != null) {
            let title = document.getElementById("content" + i);
            let titlePosition = title.getBoundingClientRect().top;
            let screenPosition = window.innerHeight;
            if (titlePosition < screenPosition - 200) {
                fadeInElement("content" + i, false);
            } else {
                window.addEventListener("scroll", function() {fadeInElement("content" + i, false);});
            }
        }
    }

    const containers = document.querySelectorAll('.container');
    containerLoop: for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        const containerPosition = container.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;
        if (containerPosition < screenPosition - 100) {
            animateContainers();
        } else {
            window.addEventListener('scroll', () => {
            animateContainers();
            });
            break containerLoop;
        }
    }
});

window.addEventListener("scroll", function() {fadeInElement("projects", true);});
window.addEventListener("scroll", function() {fadeInElement("about", false);});
window.addEventListener("scroll", function() {fadeInElement("skills", false);});
window.addEventListener("scroll", function() {fadeInElement("containers", false);});

// Animate Containers
function animateContainers() {
    const containers = document.querySelectorAll('.container');
    containers.forEach((container) => {
        const containerPosition = container.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;
        if (containerPosition < screenPosition - 100) {
            setTimeout(function() {
                gsap.to(container, { opacity: 1, y: 0 });
                container.classList.add('animate');
            }, 500);
            container.style.transform = 'scale(1)';
            container.addEventListener('mouseenter', () => {
                container.classList.add('expanded');
            });
            container.addEventListener('mouseleave', () => {
                container.classList.remove('expanded');
                container.style.transform = 'scale(1)';
            });       
        }
    });
}