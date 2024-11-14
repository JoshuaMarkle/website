const parallaxElements = document.querySelectorAll('.parallax-text');

// Center of the screen
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;

// Map movement strengths to each strength class
const strengthMap = {
  'parallax-1': 10,
  'parallax-2': 20,
  'parallax-3': 30
};

document.addEventListener('mousemove', (event) => {
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  parallaxElements.forEach((element) => {
    // Determine strength based on class
    let movementStrength = 30; // Default movement strength
    for (const [className, strength] of Object.entries(strengthMap)) {
      if (element.classList.contains(className)) {
        movementStrength = strength;
        break;
      }
    }

    // Calculate offset
    const offsetX = ((mouseX - centerX) / centerX) * movementStrength;
    const offsetY = ((mouseY - centerY) / centerY) * movementStrength;

    // Apply transform to each parallax element
    element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  });
});
