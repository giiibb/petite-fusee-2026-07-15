/**
 * Home page interactivity — gentle focus/hover effects, nothing jarring.
 */

document.querySelectorAll('.game-card').forEach((card) => {
  card.addEventListener('pointerenter', () => {
    card.style.transform = 'translateY(-6px) scale(1.02)';
  });
  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});
