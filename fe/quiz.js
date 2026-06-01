const state = {
  questions: [],
  currentSlideIndex: 0,
  answers: {},
  selectedLeftId: null,
  participant: null,
  toastTimer: null
};

const els = {
  navPlayerName: document.getElementById('navPlayerName'),
  logoutBtn: document.getElementById('logoutBtn'),
  playerNameText: document.getElementById('playerNameText'),
  playerMssvText: document.getElementById('playerMssvText'),
  quizTitle: document.getElementById('quiz-title'),
  quizDesc: document.getElementById('quiz-desc'),
  quizPanel: document.getElementById('quizPanel'),
  slidesContainer: document.getElementById('slidesContainer'),
  quizStepText: document.getElementById('quizStepText'),
  quizProgressBar: document.getElementById('quizProgressBar'),
  quizBackBtn: document.getElementById('quizBackBtn'),
  quizNextBtn: document.getElementById('quizNextBtn'),
  quizSubmitBtn: document.getElementById('quizSubmitBtn'),
  resultsPanel: document.getElementById('resultsPanel'),
  resultsBadgeIcon: document.getElementById('resultsBadgeIcon'),
  resultsStatusTitle: document.getElementById('resultsStatusTitle'),
  resultsScoreVal: document.getElementById('resultsScoreVal'),
  resultsCorrectCountText: document.getElementById('resultsCorrectCountText'),
  resultsStatusDesc: document.getElementById('resultsStatusDesc'),
  breakdownContainer: document.getElementById('breakdownContainer'),
  retryQuizBtn: document.getElementById('retryQuizBtn'),
  toast: document.getElementById('quizToast')
};

// ── Toast Utility ──
function showToast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('is-show');
  state.toastTimer = setTimeout(() => els.toast.classList.remove('is-show'), 2800);
}

// ── Restore Participant ──
function restoreParticipant() {
  const AUTH_KEY = 'sacmaudisan_participant';
  const GAME_KEY = 'currentParticipant';
  try {
    const p = JSON.parse(sessionStorage.getItem(AUTH_KEY)) ||
              JSON.parse(sessionStorage.getItem(GAME_KEY));
    if (p && p.id) {
      state.participant = p;
      els.navPlayerName.textContent = p.fullName || p.studentId;
      els.playerNameText.textContent = p.fullName;
      els.playerMssvText.textContent = `MSSV: ${p.studentId}`;
    }
  } catch (e) {
    window.location.replace('/auth');
  }
}

// ── Fetch Quiz Data ──
async function fetchQuiz() {
  try {
    const res = await fetch('/api/game/quiz');
    if (!res.ok) throw new Error('Không thể tải câu hỏi.');
    const data = await res.json();
    
    els.quizTitle.textContent = data.title;
    els.quizDesc.textContent = data.subtitle || data.description;
    state.questions = data.questions;
    
    // Initialize answers structure
    state.questions.forEach(q => {
      if (q.type === 'matching') {
        state.answers[q.id] = {};
      } else {
        state.answers[q.id] = '';
      }
    });

    renderSlides();
    showSlide(0);
  } catch (err) {
    showToast(err.message);
    console.error(err);
  }
}

// ── Render All Slides ──
function renderSlides() {
  els.slidesContainer.innerHTML = state.questions.map((q, idx) => {
    let content = '';

    if (q.type === 'multiple-choice') {
      content = `
        <div class="options-list">
          ${q.options.map((opt, optIdx) => `
            <button type="button" class="option-card" data-q-id="${q.id}" data-opt-idx="${optIdx}">
              <span class="option-letter">${String.fromCharCode(65 + optIdx)}</span>
              <span class="option-text">${escapeHTML(opt)}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else if (q.type === 'fill-in-blank') {
      content = `
        <div class="fill-blank-container">
          <p class="section-kicker">Nhập câu trả lời của bạn</p>
          <input type="text" class="fill-blank-input" data-q-id="${q.id}" placeholder="Nhập đáp án tại đây..." value="${escapeHTML(state.answers[q.id] || '')}">
        </div>
      `;
    } else if (q.type === 'matching') {
      content = `
        <p class="section-kicker">${escapeHTML(q.instruction)}</p>
        <div class="game-board" id="quizGameBoard" style="position:relative; margin-top:12px;">
          <svg class="connection-layer" id="quizConnectionLayer" aria-hidden="true"></svg>
          <div class="column">
            <div class="column__title">Vế A</div>
            <div class="card-list" id="quizLeftColumn">
              ${q.leftCards.map((card, cardIdx) => `
                <button type="button" class="match-card" data-side="left" data-card-id="${card.id}">
                  <span class="match-card__index">${cardIdx + 1}</span>
                  <span class="match-card__text">${escapeHTML(card.text)}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="column column--right">
            <div class="column__title">Vế B</div>
            <div class="card-list" id="quizRightColumn">
              ${q.rightCards.map((card, cardIdx) => `
                <button type="button" class="match-card" data-side="right" data-card-id="${card.id}">
                  <span class="match-card__index">${cardIdx + 1}</span>
                  <span class="match-card__text">${escapeHTML(card.text)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="question-slide" id="slide-${idx}">
        <p class="section-kicker">Câu hỏi ${idx + 1} của ${state.questions.length}</p>
        <h3 class="question-text">${escapeHTML(q.question || q.instruction || 'Câu hỏi ghép đôi')}</h3>
        ${content}
      </div>
    `;
  }).join('');

  setupEventHandlers();
}

// ── Setup Interactivity inside Slides ──
function setupEventHandlers() {
  // MC Selectors
  document.querySelectorAll('.option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.dataset.qId;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      
      // Update state
      state.answers[qId] = optIdx;
      
      // Update UI classes
      document.querySelectorAll(`.option-card[data-q-id="${qId}"]`).forEach(c => {
        c.classList.toggle('selected', parseInt(c.dataset.optIdx, 10) === optIdx);
      });
    });
  });

  // Fill in the blanks input handler
  document.querySelectorAll('.fill-blank-input').forEach(input => {
    input.addEventListener('input', () => {
      state.answers[input.dataset.qId] = input.value;
    });
  });

  // Matching handler
  document.querySelectorAll('#quizLeftColumn .match-card').forEach(card => {
    card.addEventListener('click', () => selectLeft(card.dataset.cardId));
  });

  document.querySelectorAll('#quizRightColumn .match-card').forEach(card => {
    card.addEventListener('click', () => selectRight(card.dataset.cardId));
  });
}

// ── Select Left Card (Matching) ──
function selectLeft(leftId) {
  state.selectedLeftId = state.selectedLeftId === leftId ? null : leftId;
  renderMatchingUI();
  requestAnimationFrame(drawQuizConnections);
}

// ── Select Right Card (Matching) ──
function selectRight(rightId) {
  if (!state.selectedLeftId) {
    showToast('Chọn một thẻ ở vế A trước, sau đó chọn thẻ vế B để ghép cặp.');
    return;
  }
  
  const qId = state.questions[state.currentSlideIndex].id;
  const currentMatchingAnswers = state.answers[qId] || {};

  // Remove rightId from any other left cards to ensure 1-1 mapping
  for (const [lId, rId] of Object.entries(currentMatchingAnswers)) {
    if (rId === rightId && lId !== state.selectedLeftId) {
      delete currentMatchingAnswers[lId];
    }
  }

  currentMatchingAnswers[state.selectedLeftId] = rightId;
  state.answers[qId] = currentMatchingAnswers;
  state.selectedLeftId = null;

  renderMatchingUI();
  requestAnimationFrame(drawQuizConnections);
}

// ── Update Card visual classes for Matching ──
function renderMatchingUI() {
  const qId = state.questions[state.currentSlideIndex].id;
  const currentMatchingAnswers = state.answers[qId] || {};

  // Left column UI update
  document.querySelectorAll('#quizLeftColumn .match-card').forEach(card => {
    const cardId = card.dataset.cardId;
    const isSelected = state.selectedLeftId === cardId;
    const isPaired = !!currentMatchingAnswers[cardId];
    
    card.classList.toggle('is-selected', isSelected);
    card.classList.toggle('is-paired', isPaired);
  });

  // Right column UI update
  document.querySelectorAll('#quizRightColumn .match-card').forEach(card => {
    const cardId = card.dataset.cardId;
    const isPaired = Object.values(currentMatchingAnswers).includes(cardId);
    card.classList.toggle('is-paired', isPaired);
  });
}

// ── Draw Connection lines in SVG for Matching ──
function drawQuizConnections() {
  const board = document.getElementById('quizGameBoard');
  const layer = document.getElementById('quizConnectionLayer');
  if (!board || !layer) return;

  const boardRect = board.getBoundingClientRect();
  const qId = state.questions[state.currentSlideIndex].id;
  const currentMatchingAnswers = state.answers[qId] || {};
  const paths = [];

  for (const [leftId, rightId] of Object.entries(currentMatchingAnswers)) {
    const leftEl = board.querySelector(`#quizLeftColumn [data-card-id="${CSS.escape(leftId)}"]`);
    const rightEl = board.querySelector(`#quizRightColumn [data-card-id="${CSS.escape(rightId)}"]`);
    if (!leftEl || !rightEl) continue;

    const leftRect = leftEl.getBoundingClientRect();
    const rightRect = rightEl.getBoundingClientRect();

    const x1 = leftRect.right - boardRect.left;
    const y1 = leftRect.top + leftRect.height / 2 - boardRect.top;
    const x2 = rightRect.left - boardRect.left;
    const y2 = rightRect.top + rightRect.height / 2 - boardRect.top;

    const c1 = x1 + Math.max(36, (x2 - x1) * 0.38);
    const c2 = x2 - Math.max(36, (x2 - x1) * 0.38);

    paths.push(`<path d="M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}" />`);
  }

  layer.innerHTML = paths.join('');
}

// ── Slide Navigation ──
function showSlide(index) {
  document.querySelectorAll('.question-slide').forEach(s => s.classList.remove('active'));
  
  const slide = document.getElementById(`slide-${index}`);
  if (slide) slide.classList.add('active');

  state.currentSlideIndex = index;
  
  // Update Back Button
  els.quizBackBtn.disabled = index === 0;

  // Update Next / Submit Buttons
  if (index === state.questions.length - 1) {
    els.quizNextBtn.style.display = 'none';
    els.quizSubmitBtn.style.display = 'inline-flex';
  } else {
    els.quizNextBtn.style.display = 'inline-flex';
    els.quizSubmitBtn.style.display = 'none';
  }

  // Update Progress values
  els.quizStepText.textContent = `Câu hỏi ${index + 1}/${state.questions.length}`;
  els.quizProgressBar.style.width = `${((index + 1) / state.questions.length) * 100}%`;

  // Draw lines if it's the matching slide (last question)
  if (state.questions[index]?.type === 'matching') {
    setTimeout(() => {
      renderMatchingUI();
      requestAnimationFrame(drawQuizConnections);
    }, 50);
  }
}

// ── Check if current slide has been answered ──
function validateCurrentSlide() {
  const q = state.questions[state.currentSlideIndex];
  const ans = state.answers[q.id];

  if (q.type === 'multiple-choice') {
    if (ans === '') {
      showToast('Vui lòng chọn một đáp án trước khi tiếp tục.');
      return false;
    }
  } else if (q.type === 'fill-in-blank') {
    if (!ans || !ans.trim()) {
      showToast('Vui lòng nhập câu trả lời trước khi tiếp tục.');
      return false;
    }
  } else if (q.type === 'matching') {
    const leftCount = q.leftCards.length;
    const answeredCount = Object.keys(ans || {}).length;
    if (answeredCount < leftCount) {
      showToast(`Vui lòng nối đầy đủ ${leftCount} cặp trước khi tiếp tục.`);
      return false;
    }
  }
  return true;
}

// ── Submit API call ──
async function submitQuiz() {
  if (!validateCurrentSlide()) return;

  els.quizSubmitBtn.disabled = true;
  els.quizSubmitBtn.textContent = 'Đang gửi bài...';

  try {
    const response = await fetch('/api/submit/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: state.participant?.id,
        answers: state.answers
      })
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nộp bài thất bại.');

    // Save updated participant session storage if passed
    if (result.participant) {
      const AUTH_KEY = 'sacmaudisan_participant';
      const GAME_KEY = 'currentParticipant';
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(result.participant));
      sessionStorage.setItem(GAME_KEY, JSON.stringify(result.participant));
    }

    displayResults(result);
  } catch (err) {
    showToast(err.message);
    els.quizSubmitBtn.disabled = false;
    els.quizSubmitBtn.textContent = '🚀 Nộp bài & xem điểm';
  }
}

// ── Display Results Card ──
function displayResults(result) {
  els.quizPanel.style.display = 'none';
  els.resultsPanel.classList.add('active');

  els.resultsScoreVal.textContent = `${result.score}/100`;
  els.resultsCorrectCountText.textContent = `Trả lời đúng ${result.correctCount} trên ${result.totalCount} câu hỏi`;

  const badge = els.resultsBadgeIcon;
  badge.className = `results-badge ${result.passed ? 'passed' : 'failed'}`;
  badge.innerHTML = result.passed 
    ? '<span class="material-symbols-outlined" style="font-size:48px; font-variation-settings:\'FILL\' 1;">check_circle</span>'
    : '<span class="material-symbols-outlined" style="font-size:48px; font-variation-settings:\'FILL\' 1;">cancel</span>';

  if (result.passed) {
    els.resultsStatusTitle.textContent = 'Chúc mừng, bạn đã ĐẠT!';
    els.resultsStatusDesc.textContent = 'Bạn đã hoàn thành xuất sắc thử thách Quiz Dân Chủ với điểm số trên 80%. Kết quả của bạn đã được cập nhật thành công!';
  } else {
    els.resultsStatusTitle.textContent = 'Bạn chưa đạt yêu cầu';
    els.resultsStatusDesc.textContent = 'Bạn cần trả lời đúng từ 80% câu hỏi trở lên (tương đương 80 điểm) để hoàn thành thử thách này. Hãy cùng ôn tập và thử lại nhé!';
  }

  // Render question breakdown list
  els.breakdownContainer.innerHTML = state.questions.map((q, idx) => {
    const isCorrect = result.results[q.id];
    let typeText = q.type === 'multiple-choice' ? 'Trắc nghiệm' : q.type === 'fill-in-blank' ? 'Điền từ' : 'Nối cặp';
    return `
      <div class="results-breakdown-item">
        <span class="results-breakdown-q">Câu ${idx + 1}: ${typeText}</span>
        <span class="results-breakdown-status ${isCorrect ? 'correct' : 'incorrect'}">
          <span class="material-symbols-outlined" style="font-size: 1.1rem; font-weight: bold;">
            ${isCorrect ? 'check' : 'close'}
          </span>
          ${isCorrect ? 'Đúng' : 'Sai'}
        </span>
      </div>
    `;
  }).join('');
}

// ── Escape HTML utility ──
function escapeHTML(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ── Bind navigation buttons ──
els.quizBackBtn.addEventListener('click', () => {
  if (state.currentSlideIndex > 0) {
    showSlide(state.currentSlideIndex - 1);
  }
});

els.quizNextBtn.addEventListener('click', () => {
  if (validateCurrentSlide()) {
    showSlide(state.currentSlideIndex + 1);
  }
});

els.quizSubmitBtn.addEventListener('click', submitQuiz);

els.retryQuizBtn.addEventListener('click', () => {
  state.currentSlideIndex = 0;
  // Clear answers
  state.questions.forEach(q => {
    if (q.type === 'matching') {
      state.answers[q.id] = {};
    } else {
      state.answers[q.id] = '';
    }
  });

  els.resultsPanel.classList.remove('active');
  els.quizPanel.style.display = 'block';
  
  els.quizSubmitBtn.disabled = false;
  els.quizSubmitBtn.textContent = '🚀 Nộp bài & xem điểm';
  
  // Rerender input fields and active states
  renderSlides();
  showSlide(0);
});

// Logout handler
els.logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('sacmaudisan_participant');
  sessionStorage.removeItem('currentParticipant');
  window.location.href = '/auth';
});

// Event listener for screen resizing to adjust matching SVG lines
window.addEventListener('resize', () => {
  if (state.questions[state.currentSlideIndex]?.type === 'matching') {
    requestAnimationFrame(drawQuizConnections);
  }
});

// ── Init ──
restoreParticipant();
fetchQuiz();
