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
  document.getElementById('lockOverlay').classList.toggle('active');
}

const secretCodeHash = "f8cc38fe3d7c153ac00ecd87544309047b5cf4ab9110f44f10a2c12f2f0745f5";

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const codeInputs = document.querySelectorAll('.code-digit');

codeInputs.forEach((input, i) => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value !== '' && i < codeInputs.length - 1) codeInputs[i + 1].focus();
    checkAllCorrect();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && i > 0) {
      codeInputs[i - 1].focus();
    }
  });
});

async function checkAllCorrect() {
  const entered = Array.from(codeInputs).map(inp => inp.value).join('');
  if (entered.length < codeInputs.length) return;

  const enteredHash = await sha256(entered);

  if (enteredHash === secretCodeHash) {
    codeInputs.forEach(inp => { inp.classList.add('correct'); inp.classList.remove('wrong'); });
    setTimeout(() => {
      document.getElementById('lockedView').style.display = 'none';
      document.getElementById('letterView').style.display = 'block';
      startCountdown();
    }, 500);
  } else {
    codeInputs.forEach(inp => { inp.classList.add('wrong'); inp.classList.remove('correct'); });
  }
}

let countdownStarted = false;

function startCountdown() {
  if (countdownStarted) return;
  countdownStarted = true;

  const target = new Date('2026-11-25T00:00:00');
  const timerEl = document.getElementById('countdownTimer');
  const overlay = document.getElementById('countdownOverlay');
  const continueBtn = document.getElementById('continueBtn');

  const interval = setInterval(() => {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      clearInterval(interval);
      overlay.style.display = 'none';
      document.querySelector('.letter-text').classList.remove('blurred');
      continueBtn.style.display = 'inline-block';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    timerEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

function goToQuestion() {
  document.getElementById('letterView').style.display = 'none';
  document.getElementById('questionView').style.display = 'block';
}

function answer(choice) {
  const msg = document.getElementById('answerMsg');
  if (choice === 'yes') {
    msg.textContent = "..."; // yahan apna response likh
  } else {
    msg.textContent = "..."; // yahan apna response likh
  }
}