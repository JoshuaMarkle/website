// Card Tilt Effect
document.querySelectorAll('.card').forEach((card) => {
    const THRESHOLD = 15; // Maximum tilt angle in degrees
    function handleHover(e) {
        const { clientX, clientY, currentTarget } = e;
        const { clientWidth, clientHeight } = currentTarget;
        const rect = currentTarget.getBoundingClientRect();

        // Calculate the position of the mouse relative to the card
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Normalize mouse position to a value between -1 and 1
        const rotateX = ((y / clientHeight) - 0.5) * -THRESHOLD;
        const rotateY = ((x / clientWidth) - 0.5) * THRESHOLD;

        // Apply the transform
        currentTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    }

    function resetTilt() {
        // Reset the card to its default state
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    }

    // Add event listeners for mouse movement and leave
    card.addEventListener('mousemove', handleHover);
    card.addEventListener('mouseleave', resetTilt);
});

// Parallax Effect
const parallaxElements = document.querySelectorAll('.parallax-text');
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
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
