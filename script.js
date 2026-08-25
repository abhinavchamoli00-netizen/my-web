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

const secretCode = "2379520"; // 👈 

const codeInputs = document.querySelectorAll('.code-digit');
codeInputs.forEach((input, i) => {
  input.addEventListener('input', () => {
    const val = input.value;
    if (val === secretCode[i]) {
      input.classList.remove('wrong');
      input.classList.add('correct');
      if (i < codeInputs.length - 1) codeInputs[i + 1].focus();
    } else if (val !== '') {
      input.classList.remove('correct');
      input.classList.add('wrong');
    } else {
      input.classList.remove('correct', 'wrong');
    }
    checkAllCorrect();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && i > 0) {
      codeInputs[i - 1].focus();
    }
  });
});

function checkAllCorrect() {
  const allCorrect = Array.from(codeInputs).every((inp, i) => inp.value === secretCode[i]);
  if (allCorrect) {
    setTimeout(() => {
      document.getElementById('lockedView').style.display = 'none';
      document.getElementById('letterView').style.display = 'block';
      startCountdown();
    }, 500);
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