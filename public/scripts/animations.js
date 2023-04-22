function fadeInTitle() {
    let title = document.getElementById("title");
    let titlePosition = title.offsetTop;
    let screenPosition = window.innerHeight;
    if (titlePosition < screenPosition) {
        setTimeout(function() {
            title.classList.add("fade-in", "show");
        }, 500)
    }
}

function fadeInProjects() {
    let title = document.getElementById("projects");
    let titlePosition = title.offsetTop;
    let screenPosition = window.innerHeight;
    if (titlePosition < screenPosition) {
        setTimeout(function() {
            title.classList.add("fade-in", "show");
        }, 500)
    }
}

window.addEventListener("scroll", fadeInTitle);