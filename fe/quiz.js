const state = {
  questions: [],
  currentSlideIndex: 0,
  answers: {},
  selectedLeftId: null,
  participant: null,
  toastTimer: null,
  timeLeft: 300, // 5 minutes timer
  timerInterval: null
};

const els = {
  navPlayerName: document.getElementById('navPlayerName'),
  logoutBtn: document.getElementById('logoutBtn'),
  playerNameText: document.getElementById('playerNameText'),
  playerMssvText: document.getElementById('playerMssvText'),
  timerElement: document.getElementById('timer'),
  progressNumbers: document.getElementById('progressNumbers'),
  progressBarFill: document.getElementById('progressBarFill'),
  slidesContainer: document.getElementById('slidesContainer'),
  interactiveContainer: document.getElementById('interactiveContainer'),
  contextText: document.getElementById('contextText'),
  contextBox: document.getElementById('contextBox'),
  quizBackBtn: document.getElementById('quizBackBtn'),
  quizNextBtn: document.getElementById('quizNextBtn'),
  quizSubmitBtn: document.getElementById('quizSubmitBtn'),
  quizContent: document.getElementById('quizContent'),
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
  if (!els.toast) return;
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
      if (els.navPlayerName) els.navPlayerName.textContent = p.fullName || p.studentId;
      if (els.playerNameText) els.playerNameText.textContent = p.fullName;
      if (els.playerMssvText) els.playerMssvText.textContent = `MSSV: ${p.studentId}`;
    }
  } catch (e) {
    window.location.replace('/auth');
  }
}

// ── Countdown Timer ──
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = 300; // Reset to 5 mins
  
  if (!els.timerElement) return;

  state.timerInterval = setInterval(() => {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    els.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      els.timerElement.classList.add('text-error', 'font-bold');
      els.timerElement.textContent = "HẾT GIỜ";
      showToast("Đã hết thời gian làm bài! Đang tự động nộp...");
      setTimeout(submitQuiz, 1500);
    } else {
      state.timeLeft--;
    }
  }, 1000);
}

// ── Fetch Quiz Data ──
async function fetchQuiz() {
  try {
    const res = await fetch('/api/game/quiz');
    if (!res.ok) throw new Error('Không thể tải câu hỏi.');
    const data = await res.json();
    
    state.questions = data.questions || [];
    
    // Initialize answers structure
    state.questions.forEach(q => {
      if (q.type === 'matching') {
        state.answers[q.id] = {};
      } else {
        state.answers[q.id] = '';
      }
    });

    if (state.questions.length > 0) {
      showSlide(0);
      startTimer();
    } else {
      showToast('Không tìm thấy câu hỏi nào.');
    }
  } catch (err) {
    showToast(err.message);
    console.error(err);
  }
}

// ── Show Question Slide ──
function showSlide(index) {
  state.currentSlideIndex = index;
  const q = state.questions[index];
  if (!q) return;

  // 1. Update progress indicator
  if (els.progressNumbers) {
    els.progressNumbers.innerHTML = `${index + 1} <span class="text-on-surface-variant font-body-md">/ ${state.questions.length}</span>`;
  }
  if (els.progressBarFill) {
    els.progressBarFill.style.width = `${((index + 1) / state.questions.length) * 100}%`;
  }

  // 2. Render Question slide layout
  if (els.slidesContainer) {
    els.slidesContainer.innerHTML = `
      <section class="w-full mb-12">
        <div class="relative p-8 md:p-12 border border-secondary-container bg-surface-container-low silk-texture">
          <span class="absolute top-0 left-8 -translate-y-1/2 bg-primary text-on-primary px-4 py-1 font-label-sm text-label-sm uppercase">Câu hỏi ${(index + 1).toString().padStart(2, '0')}</span>
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface italic text-center leading-relaxed">
            "${escapeHTML(q.question || q.instruction)}"
          </h2>
        </div>
      </section>
    `;
  }

  // 3. Render dynamic Interactive selection areas
  renderInteractiveArea(q);

  // 4. Update historical context explanation box
  if (els.contextText) {
    els.contextText.textContent = q.context || 'Đang cập nhật thông tin bối cảnh lịch sử.';
  }

  // 5. Manage navigation actions
  if (els.quizBackBtn) els.quizBackBtn.disabled = index === 0;
  
  if (index === state.questions.length - 1) {
    if (els.quizNextBtn) els.quizNextBtn.classList.add('hidden');
    if (els.quizSubmitBtn) els.quizSubmitBtn.classList.remove('hidden');
  } else {
    if (els.quizNextBtn) els.quizNextBtn.classList.remove('hidden');
    if (els.quizSubmitBtn) els.quizSubmitBtn.classList.add('hidden');
  }
}

// ── Render Interactive components based on question types ──
function renderInteractiveArea(q) {
  const container = els.interactiveContainer;
  if (!container) return;

  const ans = state.answers[q.id];

  if (q.type === 'multiple-choice') {
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full mb-16" id="mcGrid">
        ${q.options.map((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const isSelected = ans === optIdx;
          const selectedClasses = isSelected ? 'bg-secondary-container/20 border-primary' : '';
          return `
            <button class="group relative flex items-center p-6 bg-surface-container border border-outline-variant hover:border-primary transition-all duration-300 text-left active:scale-[0.98] ${selectedClasses}" data-opt-idx="${optIdx}">
              <span class="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-primary text-primary font-bold mr-4 group-hover:bg-primary group-hover:text-on-primary transition-colors ${isSelected ? 'bg-primary text-on-primary' : ''}">${letter}</span>
              <p class="font-body-md text-on-surface group-hover:text-primary transition-colors ${isSelected ? 'text-primary' : ''}">${escapeHTML(opt)}</p>
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Hook listeners for Option cards
    container.querySelectorAll('#mcGrid button').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        state.answers[q.id] = optIdx;
        
        // Re-render slide to quickly update selection states
        renderInteractiveArea(q);
      });
    });

  } else if (q.type === 'fill-in-blank') {
    container.innerHTML = `
      <div class="w-full max-w-lg mx-auto mb-16 flex flex-col gap-4">
        <input type="text" class="w-full p-6 text-xl text-center bg-surface-container border border-outline-variant focus:border-primary transition-all duration-300 outline-none rounded-lg font-bold" id="fillBlankInput" placeholder="Nhập từ hoặc cụm từ thích hợp..." value="${escapeHTML(ans || '')}">
      </div>
    `;

    const input = container.querySelector('#fillBlankInput');
    if (input) {
      input.addEventListener('input', () => {
        state.answers[q.id] = input.value;
      });
    }

  } else if (q.type === 'matching') {
    container.innerHTML = `
      <div class="w-full mb-16 relative" id="quizGameBoard">
        <svg class="connection-layer" id="quizConnectionLayer" aria-hidden="true"></svg>
        <div class="grid grid-cols-2 gap-12 md:gap-24 relative z-10">
          <div class="flex flex-col gap-4" id="quizLeftColumn">
            ${q.leftCards.map((card, idx) => {
              const isSelected = state.selectedLeftId === card.id;
              const isPaired = !!ans[card.id];
              const borderClass = isSelected ? 'border-primary bg-secondary-container/20' : (isPaired ? 'border-primary bg-surface-container-high' : 'border-outline-variant bg-surface-container');
              return `
                <button class="w-full p-4 border hover:border-primary text-left transition-all active:scale-[0.98] flex items-center gap-3 ${borderClass}" data-card-id="${card.id}">
                  <span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">${idx + 1}</span>
                  <p class="font-body-md text-on-surface text-sm font-semibold">${escapeHTML(card.text)}</p>
                </button>
              `;
            }).join('')}
          </div>
          <div class="flex flex-col gap-4" id="quizRightColumn">
            ${q.rightCards.map((card, idx) => {
              const isPaired = Object.values(ans).includes(card.id);
              const borderClass = isPaired ? 'border-primary bg-surface-container-high' : 'border-outline-variant bg-surface-container';
              return `
                <button class="w-full p-4 border hover:border-primary text-left transition-all active:scale-[0.98] flex items-center gap-3 ${borderClass}" data-card-id="${card.id}">
                  <span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">${idx + 1}</span>
                  <p class="font-body-md text-on-surface text-sm font-semibold">${escapeHTML(card.text)}</p>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Hook matching cards events
    container.querySelectorAll('#quizLeftColumn button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedLeftId = state.selectedLeftId === btn.dataset.cardId ? null : btn.dataset.cardId;
        renderInteractiveArea(q);
        requestAnimationFrame(drawQuizConnections);
      });
    });

    container.querySelectorAll('#quizRightColumn button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.selectedLeftId) {
          showToast('Chọn một thẻ ở vế A trước, sau đó chọn thẻ vế B để ghép cặp.');
          return;
        }
        
        const rightId = btn.dataset.cardId;
        const currentMatchingAnswers = state.answers[q.id] || {};

        // Remove mapping from other left card
        for (const [lId, rId] of Object.entries(currentMatchingAnswers)) {
          if (rId === rightId && lId !== state.selectedLeftId) {
            delete currentMatchingAnswers[lId];
          }
        }

        currentMatchingAnswers[state.selectedLeftId] = rightId;
        state.answers[q.id] = currentMatchingAnswers;
        state.selectedLeftId = null;

        renderInteractiveArea(q);
        requestAnimationFrame(drawQuizConnections);
      });
    });

    // Schedule SVG connections redraw
    setTimeout(() => requestAnimationFrame(drawQuizConnections), 50);
  }
}

// ── Draw Connection lines in SVG for Matching ──
function drawQuizConnections() {
  const board = document.getElementById('quizGameBoard');
  const layer = document.getElementById('quizConnectionLayer');
  if (!board || !layer) return;

  const boardRect = board.getBoundingClientRect();
  const q = state.questions[state.currentSlideIndex];
  if (!q) return;
  
  const currentMatchingAnswers = state.answers[q.id] || {};
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

// ── Validate current slide response ──
function validateCurrentSlide() {
  const q = state.questions[state.currentSlideIndex];
  if (!q) return false;

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

// ── Submit Quiz API ──
async function submitQuiz() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  if (els.quizSubmitBtn) {
    els.quizSubmitBtn.disabled = true;
    els.quizSubmitBtn.textContent = 'Đang nộp bài...';
  }

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

    // Update session storage
    if (result.participant) {
      const AUTH_KEY = 'sacmaudisan_participant';
      const GAME_KEY = 'currentParticipant';
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(result.participant));
      sessionStorage.setItem(GAME_KEY, JSON.stringify(result.participant));
    }

    displayResults(result);
  } catch (err) {
    showToast(err.message);
    if (els.quizSubmitBtn) {
      els.quizSubmitBtn.disabled = false;
      els.quizSubmitBtn.textContent = 'Nộp bài & xem điểm';
    }
  }
}

// ── Display Results Card ──
function displayResults(result) {
  if (els.quizContent) els.quizContent.style.display = 'none';
  if (els.resultsPanel) {
    els.resultsPanel.classList.remove('hidden');
    els.resultsPanel.classList.add('flex');
  }

  if (els.resultsScoreVal) els.resultsScoreVal.textContent = `${result.score}/100`;
  if (els.resultsCorrectCountText) els.resultsCorrectCountText.textContent = `Trả lời đúng ${result.correctCount} trên ${result.totalCount} câu hỏi`;

  const badge = els.resultsBadgeIcon;
  if (badge) {
    if (result.passed) {
      badge.className = "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-white bg-green-600";
      badge.innerHTML = '<span class="material-symbols-outlined text-4xl" style="font-variation-settings:\'FILL\' 1;">check_circle</span>';
      if (els.resultsStatusTitle) els.resultsStatusTitle.textContent = 'Chúc mừng, bạn đã ĐẠT!';
      if (els.resultsStatusDesc) els.resultsStatusDesc.textContent = 'Bạn đã hoàn thành xuất sắc thử thách Quiz Dân Chủ với điểm số trên 80%. Kết quả của bạn đã được cập nhật thành công!';
    } else {
      badge.className = "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-white bg-red-600";
      badge.innerHTML = '<span class="material-symbols-outlined text-4xl" style="font-variation-settings:\'FILL\' 1;">cancel</span>';
      if (els.resultsStatusTitle) els.resultsStatusTitle.textContent = 'Bạn chưa đạt yêu cầu';
      if (els.resultsStatusDesc) els.resultsStatusDesc.textContent = 'Bạn cần đạt tối thiểu 80 điểm (đúng 8/10 câu hỏi) để vượt qua cấp độ này. Hãy thử lại để nắm vững bài hơn nhé!';
    }
  }

  // Render question breakdown
  if (els.breakdownContainer) {
    els.breakdownContainer.innerHTML = state.questions.map((q, idx) => {
      const isCorrect = result.results[q.id];
      const typeLabel = q.type === 'multiple-choice' ? 'Trắc nghiệm' : q.type === 'fill-in-blank' ? 'Điền từ' : 'Nối cặp';
      return `
        <div class="flex justify-between items-center py-2 border-b border-outline-variant/30 last:border-b-0">
          <span class="font-body-md text-on-surface font-semibold text-sm">Câu ${idx + 1}: ${typeLabel}</span>
          <span class="flex items-center gap-1 font-label-sm text-xs px-3 py-1 rounded-full ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            <span class="material-symbols-outlined text-sm font-bold">${isCorrect ? 'check' : 'close'}</span>
            ${isCorrect ? 'Đúng' : 'Sai'}
          </span>
        </div>
      `;
    }).join('');
  }
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
if (els.quizBackBtn) {
  els.quizBackBtn.addEventListener('click', () => {
    if (state.currentSlideIndex > 0) {
      showSlide(state.currentSlideIndex - 1);
    }
  });
}

if (els.quizNextBtn) {
  els.quizNextBtn.addEventListener('click', () => {
    if (validateCurrentSlide()) {
      showSlide(state.currentSlideIndex + 1);
    }
  });
}

if (els.quizSubmitBtn) els.quizSubmitBtn.addEventListener('click', submitQuiz);

if (els.retryQuizBtn) {
  els.retryQuizBtn.addEventListener('click', () => {
    state.currentSlideIndex = 0;
    state.questions.forEach(q => {
      if (q.type === 'matching') {
        state.answers[q.id] = {};
      } else {
        state.answers[q.id] = '';
      }
    });

    if (els.resultsPanel) {
      els.resultsPanel.classList.add('hidden');
      els.resultsPanel.classList.remove('flex');
    }
    if (els.quizContent) els.quizContent.style.display = 'flex';
    
    if (els.quizSubmitBtn) {
      els.quizSubmitBtn.disabled = false;
      els.quizSubmitBtn.textContent = 'Nộp bài & xem điểm';
    }
    
    showSlide(0);
    startTimer();
  });
}

// Logout handler
if (els.logoutBtn) {
  els.logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('sacmaudisan_participant');
    sessionStorage.removeItem('currentParticipant');
    window.location.href = '/auth';
  });
}

// Responsive canvas redrawing
window.addEventListener('resize', () => {
  if (state.questions[state.currentSlideIndex]?.type === 'matching') {
    requestAnimationFrame(drawQuizConnections);
  }
});

// ── Init ──
restoreParticipant();
fetchQuiz();
