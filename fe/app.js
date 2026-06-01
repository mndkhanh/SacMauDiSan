const state = {
  data: null,
  activeRoundIndex: 0,
  selectedLeftId: null,
  answers: {},
  lastCheck: null,
  sessionCompletedRounds: new Set(),
  currentParticipant: null,
  participants: [],
  toastTimer: null,
  activeView: 'game'
};

const els = {
  gameTitle: document.getElementById('game-title'),
  gameSubtitle: document.getElementById('game-subtitle'),
  gameDescription: document.getElementById('game-description'),
  startJourneyLink: document.getElementById('startJourneyLink'),
  registerSection: document.getElementById('register-section'),
  registerForm: document.getElementById('registerForm'),
  fullNameInput: document.getElementById('fullNameInput'),
  studentIdInput: document.getElementById('studentIdInput'),
  classCodeInput: null,
  appNav: document.getElementById('appNav'),
  currentPlayerPill: document.getElementById('currentPlayerPill'),
  changePlayerBtn: document.getElementById('changePlayerBtn'),
  gameView: document.getElementById('gameView'),
  participantsView: document.getElementById('participantsView'),
  refreshParticipantsBtn: document.getElementById('refreshParticipantsBtn'),
  currentPlayerCard: document.getElementById('currentPlayerCard'),
  participantsTableBody: document.getElementById('participantsTableBody'),
  savedProgressText: document.getElementById('savedProgressText'),
  rulesList: document.getElementById('rulesList'),
  rulePanel: document.getElementById('rulePanel'),
  openRulesBtn: document.getElementById('openRulesBtn'),
  closeRulesBtn: document.getElementById('closeRulesBtn'),
  progressText: document.getElementById('progressText'),
  progressBar: document.getElementById('progressBar'),
  roundTabs: document.getElementById('roundTabs'),
  roundTitle: document.getElementById('roundTitle'),
  roundInstruction: document.getElementById('roundInstruction'),
  roundSource: document.getElementById('roundSource'),
  roundNumber: document.getElementById('roundNumber'),
  pairCounter: document.getElementById('pairCounter'),
  leftColumn: document.getElementById('leftColumn'),
  rightColumn: document.getElementById('rightColumn'),
  gameBoard: document.getElementById('gameBoard'),
  connectionLayer: document.getElementById('connectionLayer'),
  submitBtn: document.getElementById('submitBtn'),
  resetBtn: document.getElementById('resetBtn'),
  nextBtn: document.getElementById('nextBtn'),
  feedbackBox: document.getElementById('feedbackBox'),
  toast: document.getElementById('toast'),
  finishModal: document.getElementById('finishModal'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  closeFinishBtn: document.getElementById('closeFinishBtn')
};

function saveCurrentParticipant() {
  if (!state.currentParticipant) return;
  sessionStorage.setItem('currentParticipant', JSON.stringify(state.currentParticipant));
}

function restoreCurrentParticipant() {
  try {
    const raw = sessionStorage.getItem('currentParticipant');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearCurrentParticipant() {
  sessionStorage.removeItem('currentParticipant');
  state.currentParticipant = null;
}

function getActiveRound() {
  return state.data.rounds[state.activeRoundIndex];
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('is-show');
  state.toastTimer = setTimeout(() => els.toast.classList.remove('is-show'), 2800);
}

function resetRoundState() {
  state.answers = {};
  state.selectedLeftId = null;
  state.lastCheck = null;
  els.feedbackBox.hidden = true;
  els.nextBtn.hidden = true;
}

function updateProgress() {
  if (!state.data) return;
  const total = state.data.rounds.length;
  const sessionDone = state.sessionCompletedRounds.size;
  const savedDone = state.currentParticipant?.completedRoundCount || 0;

  els.progressText.textContent = `${sessionDone}/${total} vòng`;
  els.progressBar.style.width = total ? `${(sessionDone / total) * 100}%` : '0%';
  els.savedProgressText.textContent = `Hồ sơ đã lưu: ${savedDone}/${total} vòng`;
  updatePlayerPill();
}

function updatePlayerPill() {
  if (!state.currentParticipant) {
    els.currentPlayerPill.textContent = 'Chưa có người chơi';
    return;
  }
  const total = state.data?.rounds?.length || state.currentParticipant.totalRounds || 0;
  els.currentPlayerPill.textContent = `${state.currentParticipant.fullName} • ${state.currentParticipant.studentId} • đã lưu ${state.currentParticipant.completedRoundCount || 0}/${total} vòng`;
}

function renderRules() {
  els.rulesList.innerHTML = state.data.rules.map(rule => `<li>${escapeHTML(rule)}</li>`).join('');
}

function renderTabs() {
  els.roundTabs.innerHTML = state.data.rounds.map((round, index) => {
    const active = index === state.activeRoundIndex ? 'is-active' : '';
    const completed = state.sessionCompletedRounds.has(round.id) ? 'is-completed' : '';
    return `
      <button type="button" class="round-tab ${active} ${completed}" data-round-index="${index}">
        <strong>Vòng ${round.order}</strong>
        <span>${escapeHTML(round.category)}</span>
      </button>
    `;
  }).join('');

  els.roundTabs.querySelectorAll('.round-tab').forEach(button => {
    button.addEventListener('click', () => {
      state.activeRoundIndex = Number(button.dataset.roundIndex);
      resetRoundState();
      renderGame();
      showToast(`Đã chuyển sang vòng ${getActiveRound().order}.`);
    });
  });
}

function renderGame() {
  if (!state.data) return;
  const round = getActiveRound();
  els.gameTitle.textContent = state.data.title;
  els.gameSubtitle.textContent = state.data.subtitle;
  els.gameDescription.textContent = state.data.description;
  els.roundTitle.textContent = round.category;
  els.roundInstruction.textContent = round.instruction;
  els.roundSource.textContent = `Nguồn: ${round.source}`;
  els.roundNumber.textContent = `Vòng ${round.order}/${state.data.rounds.length}`;
  renderTabs();
  renderCards();
  updateProgress();
  requestAnimationFrame(drawConnections);
}

function renderCards() {
  const round = getActiveRound();
  const wrongIds = new Set((state.lastCheck?.wrong || []).map(item => item.leftId));
  const correctIds = state.lastCheck?.completed ? new Set(round.leftCards.map(card => card.id)) : new Set();

  els.leftColumn.innerHTML = round.leftCards.map((card, index) => {
    const isPaired = Boolean(state.answers[card.id]);
    const selected = state.selectedLeftId === card.id ? 'is-selected' : '';
    const paired = isPaired ? 'is-paired' : '';
    const wrong = wrongIds.has(card.id) ? 'is-wrong' : '';
    const correct = correctIds.has(card.id) ? 'is-correct' : '';
    return makeCardHTML(card, index + 1, 'left', `${selected} ${paired} ${wrong} ${correct}`);
  }).join('');

  els.rightColumn.innerHTML = round.rightCards.map((card, index) => {
    const pairedLeftId = Object.keys(state.answers).find(leftId => state.answers[leftId] === card.id);
    const paired = pairedLeftId ? 'is-paired' : '';
    const wrong = pairedLeftId && wrongIds.has(pairedLeftId) ? 'is-wrong' : '';
    const correct = correctIds.has(pairedLeftId) ? 'is-correct' : '';
    return makeCardHTML(card, index + 1, 'right', `${paired} ${wrong} ${correct}`);
  }).join('');

  els.leftColumn.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', () => selectLeft(card.dataset.cardId));
  });

  els.rightColumn.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', () => selectRight(card.dataset.cardId));
  });

  const pairedCount = Object.keys(state.answers).length;
  els.pairCounter.textContent = `${pairedCount}/${round.leftCards.length} cặp`;
  els.submitBtn.disabled = pairedCount !== round.leftCards.length || !state.currentParticipant;
}

function makeCardHTML(card, index, side, className = '') {
  return `
    <button type="button" class="match-card ${className}" data-side="${side}" data-card-id="${card.id}">
      <span class="match-card__index">${index}</span>
      <span class="match-card__text">${escapeHTML(card.text)}</span>
    </button>
  `;
}

function selectLeft(leftId) {
  if (!state.currentParticipant) {
    showToast('Bạn cần đăng ký thông tin trước khi chơi.');
    scrollToRegister();
    return;
  }
  state.selectedLeftId = state.selectedLeftId === leftId ? null : leftId;
  clearCheckOnly();
  renderCards();
  requestAnimationFrame(drawConnections);
}

function selectRight(rightId) {
  if (!state.currentParticipant) {
    showToast('Bạn cần đăng ký thông tin trước khi chơi.');
    scrollToRegister();
    return;
  }

  if (!state.selectedLeftId) {
    showToast('Bạn hãy chọn một thẻ ở vế A trước, sau đó chọn thẻ ở vế B để nối.');
    return;
  }

  for (const [leftId, selectedRightId] of Object.entries(state.answers)) {
    if (selectedRightId === rightId && leftId !== state.selectedLeftId) {
      delete state.answers[leftId];
    }
  }

  state.answers[state.selectedLeftId] = rightId;
  state.selectedLeftId = null;
  clearCheckOnly();
  renderCards();
  requestAnimationFrame(drawConnections);
}

function clearCheckOnly() {
  if (state.lastCheck && !state.lastCheck.completed) {
    state.lastCheck = null;
    els.feedbackBox.hidden = true;
  }
}

function drawConnections() {
  if (!els.gameBoard || els.gameView.hidden) return;
  const boardRect = els.gameBoard.getBoundingClientRect();
  const paths = [];
  const wrongIds = new Set((state.lastCheck?.wrong || []).map(item => item.leftId));
  const correctIds = state.lastCheck?.completed ? new Set(Object.keys(state.answers)) : new Set();

  for (const [leftId, rightId] of Object.entries(state.answers)) {
    const leftEl = els.leftColumn.querySelector(`[data-card-id="${CSS.escape(leftId)}"]`);
    const rightEl = els.rightColumn.querySelector(`[data-card-id="${CSS.escape(rightId)}"]`);
    if (!leftEl || !rightEl) continue;

    const leftRect = leftEl.getBoundingClientRect();
    const rightRect = rightEl.getBoundingClientRect();
    const x1 = leftRect.right - boardRect.left;
    const y1 = leftRect.top + leftRect.height / 2 - boardRect.top;
    const x2 = rightRect.left - boardRect.left;
    const y2 = rightRect.top + rightRect.height / 2 - boardRect.top;
    const c1 = x1 + Math.max(36, (x2 - x1) * 0.38);
    const c2 = x2 - Math.max(36, (x2 - x1) * 0.38);
    const status = wrongIds.has(leftId) ? 'is-wrong' : correctIds.has(leftId) ? 'is-correct' : '';

    paths.push(`<path class="${status}" d="M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}" />`);
  }

  els.connectionLayer.innerHTML = paths.join('');
}

async function submitAnswers() {
  const round = getActiveRound();
  if (!state.currentParticipant) {
    showToast('Bạn cần đăng ký thông tin trước khi kiểm tra kết quả.');
    scrollToRegister();
    return;
  }

  if (Object.keys(state.answers).length !== round.leftCards.length) {
    showToast('Bạn cần nối đủ 4 cặp trước khi kiểm tra.');
    return;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Đang kiểm tra...';

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: state.currentParticipant.id,
        roundId: round.id,
        answers: state.answers
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể kiểm tra kết quả.');

    state.lastCheck = result;
    showFeedback(result);

    if (result.completed) {
      state.sessionCompletedRounds.add(round.id);
      if (result.participant) {
        state.currentParticipant = result.participant;
        saveCurrentParticipant();
      }
      els.nextBtn.hidden = false;
      updateProgress();
      await loadParticipants(false);
      if (state.sessionCompletedRounds.size === state.data.rounds.length) {
        setTimeout(() => els.finishModal.showModal(), 500);
      }
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    els.submitBtn.textContent = 'Kiểm tra kết quả';
    renderCards();
    renderTabs();
    requestAnimationFrame(drawConnections);
  }
}

function showFeedback(result) {
  els.feedbackBox.hidden = false;
  els.feedbackBox.className = `feedback ${result.completed ? 'is-success' : 'is-error'}`;
  if (result.completed) {
    els.feedbackBox.innerHTML = `✅ ${escapeHTML(result.message)} Điểm: ${result.score}/${result.total}. Số vòng đã hoàn thành đã được lưu vào hồ sơ.`;
  } else {
    els.feedbackBox.innerHTML = `❌ ${escapeHTML(result.message)} Hiện tại đúng ${result.score}/${result.total} cặp. Các đường màu đỏ là cặp chưa chính xác.`;
  }
}

function resetCurrentRound() {
  resetRoundState();
  renderGame();
  showToast('Đã làm lại vòng hiện tại.');
}

function goNextRound() {
  const total = state.data.rounds.length;
  state.activeRoundIndex = (state.activeRoundIndex + 1) % total;
  resetRoundState();
  renderGame();
  document.getElementById('gameView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function playAgain() {
  // Chơi lại chỉ xóa dấu tick trong phiên hiện tại, không xóa dữ liệu đã lưu trên backend.
  state.sessionCompletedRounds.clear();
  state.activeRoundIndex = 0;
  resetRoundState();
  renderGame();
  els.finishModal.close();
}

async function handleRegister(event) {
  event.preventDefault();
  const payload = {
    fullName: els.fullNameInput.value,
    studentId: els.studentIdInput.value
  };

  const submitButton = els.registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Đang lưu thông tin...';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể đăng ký.');

    state.currentParticipant = result.participant;
    saveCurrentParticipant();
    state.sessionCompletedRounds.clear();
    resetRoundState();
    revealApp();
    switchView('game');
    renderGame();
    await loadParticipants(false);
    showToast(result.message);
    els.gameView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '🚀 Bắt đầu hành trình';
  }
}

function revealApp() {
  els.registerSection.classList.add('is-compact');
  els.appNav.hidden = false;
  els.gameView.hidden = false;
  updatePlayerPill();
}

function scrollToRegister() {
  els.registerSection.classList.remove('is-compact');
  els.registerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchView(viewName) {
  state.activeView = viewName;
  els.gameView.hidden = viewName !== 'game';
  els.participantsView.hidden = viewName !== 'participants';

  document.querySelectorAll('.nav-tab[data-view]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });

  if (viewName === 'participants') {
    loadParticipants();
  } else {
    requestAnimationFrame(drawConnections);
  }
}

async function loadParticipants(showMessage = true) {
  const refreshButton = els.refreshParticipantsBtn;
  const originalText = refreshButton?.textContent || '↻ Refresh dữ liệu';
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Đang cập nhật...';
  }

  try {
    const response = await fetch('/api/participants');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không tải được danh sách người đăng ký.');

    state.participants = result.participants || [];
    syncCurrentParticipantFromList();
    renderParticipants();
    updateProgress();
    if (showMessage) showToast('Đã cập nhật danh sách người đăng ký.');
  } catch (error) {
    showToast(error.message);
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = originalText;
    }
  }
}

function syncCurrentParticipantFromList() {
  if (!state.currentParticipant) return;
  const fresh = state.participants.find(item => item.id === state.currentParticipant.id);
  if (fresh) {
    state.currentParticipant = fresh;
    saveCurrentParticipant();
  }
}

function renderParticipants() {
  const total = state.data?.rounds?.length || 0;

  if (state.currentParticipant) {
    const participant = state.currentParticipant;
    els.currentPlayerCard.innerHTML = `
      <div>
        <span>Người chơi hiện tại</span>
        <strong>${escapeHTML(participant.fullName)}</strong>
        <p>MSSV: ${escapeHTML(participant.studentId)}</p>
      </div>
      <div class="current-player-card__stat">
        <strong>${participant.completedRoundCount || 0}/${total}</strong>
        <span>vòng đã lưu</span>
      </div>
    `;
  } else {
    els.currentPlayerCard.innerHTML = '<p>Chưa có người chơi hiện tại.</p>';
  }

  if (!state.participants.length) {
    els.participantsTableBody.innerHTML = '<tr><td colspan="6">Chưa có người đăng ký.</td></tr>';
    return;
  }

  els.participantsTableBody.innerHTML = state.participants.map((participant, index) => {
    const isCurrent = state.currentParticipant?.id === participant.id ? 'is-current' : '';
    return `
      <tr class="${isCurrent}">
        <td>${index + 1}</td>
        <td>${escapeHTML(participant.fullName)}</td>
        <td>${escapeHTML(participant.studentId)}</td>
        <td><strong>${participant.completedRoundCount || 0}/${participant.totalRounds || total}</strong></td>
        <td>${formatDateTime(participant.updatedAt)}</td>
        <td class="participant-actions">
          <button
            class="delete-participant-btn"
            type="button"
            data-delete-participant-id="${escapeHTML(participant.id)}"
            aria-label="Xóa thông tin của ${escapeHTML(participant.fullName)}"
            title="Xóa người đăng ký"
          >×</button>
        </td>
      </tr>
    `;
  }).join('');

  els.participantsTableBody.querySelectorAll('[data-delete-participant-id]').forEach(button => {
    button.addEventListener('click', () => deleteParticipant(button.dataset.deleteParticipantId));
  });
}

async function deleteParticipant(participantId) {
  const participant = state.participants.find(item => item.id === participantId);
  if (!participant) {
    showToast('Không tìm thấy người đăng ký cần xóa.');
    return;
  }

  const confirmed = window.confirm(`Bạn chắc chắn muốn xóa thông tin của ${participant.fullName} (${participant.studentId})?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/participants/${encodeURIComponent(participantId)}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể xóa người đăng ký.');

    if (state.currentParticipant?.id === participantId) {
      clearCurrentParticipant();
      state.sessionCompletedRounds.clear();
      resetRoundState();
    }

    await loadParticipants(false);
    renderGame();
    showToast(result.message || 'Đã xóa người đăng ký.');
  } catch (error) {
    showToast(error.message);
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function init() {
  try {
    const response = await fetch('/api/game');
    state.data = await response.json();
    renderRules();

    const restoredParticipant = restoreCurrentParticipant();
    if (restoredParticipant?.id) {
      state.currentParticipant = restoredParticipant;
      // Dấu tick vòng chơi không lấy từ dữ liệu đã lưu để đúng yêu cầu: refresh là tick biến mất.
      state.sessionCompletedRounds.clear();
      revealApp();
      await loadParticipants(false);
    }

    renderGame();
  } catch (error) {
    showToast('Không tải được dữ liệu game. Vui lòng kiểm tra backend.');
    console.error(error);
  }
}

els.registerForm.addEventListener('submit', handleRegister);
els.startJourneyLink.addEventListener('click', event => {
  if (state.currentParticipant) {
    event.preventDefault();
    revealApp();
    switchView('game');
    els.gameView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
els.openRulesBtn.addEventListener('click', () => els.rulePanel.classList.add('is-open'));
els.closeRulesBtn.addEventListener('click', () => els.rulePanel.classList.remove('is-open'));
els.submitBtn.addEventListener('click', submitAnswers);
els.resetBtn.addEventListener('click', resetCurrentRound);
els.nextBtn.addEventListener('click', goNextRound);
els.playAgainBtn.addEventListener('click', playAgain);
els.closeFinishBtn.addEventListener('click', () => els.finishModal.close());
els.refreshParticipantsBtn.addEventListener('click', () => loadParticipants(true));
els.changePlayerBtn.addEventListener('click', () => {
  clearCurrentParticipant();
  state.sessionCompletedRounds.clear();
  els.appNav.hidden = true;
  els.gameView.hidden = true;
  els.participantsView.hidden = true;
  els.registerSection.classList.remove('is-compact');
  updatePlayerPill();
  scrollToRegister();
});

document.querySelectorAll('.nav-tab[data-view]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

window.addEventListener('resize', () => requestAnimationFrame(drawConnections));

init();
