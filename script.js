const activeCards = document.querySelectorAll('.card.active');

activeCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0)';
  });
});
function toggleLockBox() {
  const overlay = document.getElementById('lockOverlay');
  overlay.classList.toggle('active');
}

const secretCode = "99700"; // iam still wating 

function checkCode() {
  const input = document.getElementById('codeInput').value.trim();
  if (input.toLowerCase() === secretCode.toLowerCase()) {
    document.getElementById('lockedView').style.display = 'none';
    document.getElementById('unlockedView').style.display = 'block';
  } else {
    document.getElementById('errorMsg').textContent = "Galat code, dobara try karo.";
  }
}

function answer(choice) {
  const msg = document.getElementById('answerMsg');
  if (choice === 'yes') {
    msg.textContent = "..."; // I knew... but it still hurts to hear it.
  } else {
    msg.textContent = "..."; // Shukar hai... thank you for being honest.
  }
}