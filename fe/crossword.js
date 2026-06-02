document.addEventListener('DOMContentLoaded', () => {
  const state = {
    data: null,
    participant: null,
    answers: {}, // Stores user inputs by row index: e.g. { 0: ['B', 'E', 'N'], 1: ... }
    correctRows: new Set(), // Set of rowIndices that are correct
    activeRowIndex: null,
    toastTimer: null,
    startTime: null,
    failCount: 0
  };

  const els = {
    navPlayerName: document.getElementById('navPlayerName'),
    gameSubtitle: document.getElementById('gameSubtitle'),
    gridContainer: document.getElementById('crossword-grid-container'),
    cluesList: document.getElementById('clues-list'),
    clueFactBox: document.getElementById('clueFactBox'),
    clueFactText: document.getElementById('clueFactText'),
    keywordInput: document.getElementById('keywordInput'),
    submitKeywordBtn: document.getElementById('submitKeywordBtn'),
    playPanel: document.getElementById('playPanel'),
    completionPanel: document.getElementById('completionPanel'),
    toast: document.getElementById('crosswordToast')
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
        if (els.navPlayerName) els.navPlayerName.title = p.fullName || p.studentId;
      }
    } catch (e) {
      window.location.replace('/auth');
    }
  }

  // ── Fetch Crossword Data ──
  async function fetchCrossword() {
    try {
      const res = await fetch('/api/game/crossword');
      if (!res.ok) throw new Error('Không thể tải dữ liệu ô chữ.');
      state.data = await res.json();
      
      // Initialize answers structure
      state.data.rows.forEach(r => {
        state.answers[r.rowIndex] = Array(r.answerLength).fill('');
      });
      
      state.startTime = Date.now();
      state.failCount = 0;
      renderCrossword();
    } catch (err) {
      showToast(err.message);
      console.error(err);
    }
  }

  // ── Render Crossword Grid & Clues ──
  function renderCrossword() {
    if (!state.data) return;

    const rows = state.data.rows;
    const colIndex = state.data.hiddenKeywordColIndex;

    // 1. Calculate max columns to configure Grid layout
    let maxEndCol = 0;
    rows.forEach(r => {
      const startCol = colIndex - r.highlightCol;
      const endCol = startCol + r.answerLength;
      if (endCol > maxEndCol) maxEndCol = endCol;
    });

    // Configure CSS grid columns & rows on container
    els.gridContainer.style.display = 'grid';
    els.gridContainer.style.gridTemplateColumns = `repeat(${maxEndCol}, 3.5rem)`;
    els.gridContainer.style.gridTemplateRows = `repeat(${rows.length}, 3.5rem)`;

    // Clear previous grid
    els.gridContainer.innerHTML = '';

    // 2. Generate cell inputs
    rows.forEach(r => {
      const startCol = colIndex - r.highlightCol;
      
      for (let i = 0; i < r.answerLength; i++) {
        const col = startCol + i;
        const isHighlighted = (col === colIndex); // Highlighted central key letters
        const isCorrect = state.correctRows.has(r.rowIndex);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = `crossword-input w-full h-full rounded border-2 text-center text-xl font-bold uppercase ${isHighlighted ? 'highlighted border-secondary-container bg-secondary-container/10' : 'border-outline-variant'} ${isCorrect ? 'correct' : ''}`;
        input.style.gridRow = `${r.rowIndex + 1}`;
        input.style.gridColumn = `${col + 1}`;
        input.dataset.rowIndex = r.rowIndex;
        input.dataset.charIndex = i;
        
        // Load current letter
        input.value = state.answers[r.rowIndex][i] || '';
        
        // Disabled if row is already validated correct
        if (isCorrect) input.disabled = true;

        // Caret movement listeners
        input.addEventListener('input', (e) => handleCellInput(e, input, r.rowIndex, i));
        input.addEventListener('keydown', (e) => handleCellKeydown(e, input, r.rowIndex, i));
        input.addEventListener('focus', () => {
          state.activeRowIndex = r.rowIndex;
          highlightClue(r.rowIndex);
        });

        els.gridContainer.appendChild(input);
      }
    });

    // 3. Render Clues List
    renderClues();
  }

  // ── Handle Typing in Cell ──
  function handleCellInput(e, input, rowIndex, charIndex) {
    const val = input.value.trim().toUpperCase();
    state.answers[rowIndex][charIndex] = val;

    if (val.length === 1) {
      // Jump to next input in current row
      const nextInput = els.gridContainer.querySelector(`input[data-row-index="${rowIndex}"][data-char-index="${charIndex + 1}"]`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  // ── Handle Keydown in Cell (Backspace / Arrow keys) ──
  function handleCellKeydown(e, input, rowIndex, charIndex) {
    if (e.key === 'Backspace') {
      if (input.value === '') {
        // Jump to previous cell on Backspace if current cell is empty
        const prevInput = els.gridContainer.querySelector(`input[data-row-index="${rowIndex}"][data-char-index="${charIndex - 1}"]`);
        if (prevInput) {
          prevInput.value = '';
          state.answers[rowIndex][charIndex - 1] = '';
          prevInput.focus();
          e.preventDefault();
        }
      } else {
        state.answers[rowIndex][charIndex] = '';
      }
    } else if (e.key === 'ArrowRight') {
      const nextInput = els.gridContainer.querySelector(`input[data-row-index="${rowIndex}"][data-char-index="${charIndex + 1}"]`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowLeft') {
      const prevInput = els.gridContainer.querySelector(`input[data-row-index="${rowIndex}"][data-char-index="${charIndex - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  }

  // ── Render Clues list in UI ──
  function renderClues() {
    if (!state.data) return;

    els.cluesList.innerHTML = state.data.rows.map(r => {
      const isCorrect = state.correctRows.has(r.rowIndex);
      const isActive = state.activeRowIndex === r.rowIndex;
      return `
        <div class="p-4 border rounded cursor-pointer transition-all ${isActive ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-outline-variant hover:border-primary'} ${isCorrect ? 'border-green-600 bg-green-50/50' : ''}" data-row-index="${r.rowIndex}">
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm text-primary uppercase">Hàng ngang ${r.rowIndex + 1} (${r.answerLength} chữ cái)</span>
            ${isCorrect ? `
              <span class="text-green-600 flex items-center gap-1 font-bold text-xs uppercase">
                <span class="material-symbols-outlined text-sm font-bold">check_circle</span> Đúng
              </span>
            ` : `
              <button class="bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1 hover:bg-primary hover:text-on-primary transition-all rounded check-row-btn" data-row-index="${r.rowIndex}">Kiểm tra</button>
            `}
          </div>
          <p class="font-body-md text-sm text-on-surface-variant leading-relaxed">${r.clue}</p>
        </div>
      `;
    }).join('');

    // Hook clue item click and check button events
    els.cluesList.querySelectorAll('[data-row-index]').forEach(item => {
      const rIndex = parseInt(item.dataset.rowIndex, 10);
      item.addEventListener('click', (e) => {
        // Ignore if clicking the Check button inside card
        if (e.target.classList.contains('check-row-btn')) return;
        
        state.activeRowIndex = rIndex;
        highlightClue(rIndex);
        
        // Auto focus first input of selected row
        const firstInput = els.gridContainer.querySelector(`input[data-row-index="${rIndex}"][data-char-index="0"]`);
        if (firstInput) firstInput.focus();
      });
    });

    els.cluesList.querySelectorAll('.check-row-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rIndex = parseInt(btn.dataset.rowIndex, 10);
        verifyRow(rIndex);
      });
    });
  }

  // ── Highlight Clue fact details ──
  function highlightClue(rowIndex) {
    // Update class highlight lists
    els.cluesList.querySelectorAll('[data-row-index]').forEach(item => {
      const isCurrent = parseInt(item.dataset.rowIndex, 10) === rowIndex;
      item.classList.toggle('bg-primary/5', isCurrent);
      item.classList.toggle('border-primary', isCurrent);
      item.classList.toggle('shadow-sm', isCurrent);
    });

    // Display Context explanation box if selected row is correct
    if (state.correctRows.has(rowIndex)) {
      const rowData = state.data.rows.find(r => r.rowIndex === rowIndex);
      els.clueFactBox.classList.remove('hidden');
      els.clueFactText.textContent = rowData.context || 'Đang cập nhật bối cảnh lịch sử.';
    } else {
      els.clueFactBox.classList.add('hidden');
    }
  }

  // ── Verify single crossword row via API ──
  async function verifyRow(rowIndex) {
    const rowLetters = state.answers[rowIndex] || [];
    const word = rowLetters.join('').trim().toUpperCase();

    const rData = state.data.rows.find(r => r.rowIndex === rowIndex);
    if (word.length < rData.answerLength) {
      showToast(`Vui lòng điền đủ ${rData.answerLength} chữ cái.`);
      return;
    }

    try {
      const res = await fetch('/api/submit/crossword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'row',
          rowIndex,
          answer: word
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Kiểm tra thất bại.');

      if (result.correct) {
        state.correctRows.add(rowIndex);
        showToast(`Hàng ngang ${rowIndex + 1} chính xác!`);
        
        // Update cell styles to correct
        els.gridContainer.querySelectorAll(`input[data-row-index="${rowIndex}"]`).forEach(input => {
          input.classList.add('correct');
          input.disabled = true;
        });
        
        rData.context = result.context; // Save returned context definition
        renderClues();
        highlightClue(rowIndex);
      } else {
        state.failCount++;
        showToast(`Hàng ngang ${rowIndex + 1} chưa chính xác. Hãy kiểm tra lại!`);
      }
    } catch (err) {
      showToast(err.message);
    }
  }

  // ── Submit Secret Hidden Column Keyword ──
  async function submitKeyword() {
    const keyword = els.keywordInput.value.trim().toUpperCase();
    if (!keyword) {
      showToast('Vui lòng nhập từ khóa dự đoán.');
      return;
    }

    if (keyword.length !== state.data.hiddenKeywordLength) {
      showToast(`Từ khóa bí mật cột dọc phải gồm đúng ${state.data.hiddenKeywordLength} chữ cái.`);
      return;
    }

    try {
      els.submitKeywordBtn.disabled = true;
      els.submitKeywordBtn.textContent = 'Đang gửi...';

      const duration = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
      const res = await fetch('/api/submit/crossword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'keyword',
          keyword,
          participantId: state.participant?.id,
          duration: duration,
          failCount: state.failCount
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Nộp từ khóa thất bại.');

      if (result.correct) {
        // Update local storage participant status
        if (result.participant) {
          const AUTH_KEY = 'sacmaudisan_participant';
          const GAME_KEY = 'currentParticipant';
          sessionStorage.setItem(AUTH_KEY, JSON.stringify(result.participant));
          sessionStorage.setItem(GAME_KEY, JSON.stringify(result.participant));
        }
        
        // Trigger Completion display screen
        els.playPanel.style.display = 'none';
        els.completionPanel.classList.remove('hidden');
        els.completionPanel.classList.add('flex');
        showToast('Chúc mừng! Từ khóa bí mật hoàn toàn chính xác.');

        // Automagically redirect to game dashboard after 5 seconds
        let countdown = 5;
        const redirectMsg = document.createElement('p');
        redirectMsg.className = 'text-sm font-semibold text-on-surface-variant mt-6 italic';
        redirectMsg.innerHTML = 'Hệ thống sẽ tự động chuyển hướng về phòng chờ sau <span id="countdown-val" class="font-bold text-primary">5</span> giây...';
        els.completionPanel.querySelector('.max-w-md').appendChild(redirectMsg);
        
        const interval = setInterval(() => {
          countdown--;
          const valSpan = document.getElementById('countdown-val');
          if (valSpan) valSpan.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(interval);
            window.location.href = '/lobby';
          }
        }, 1000);

      } else {
        state.failCount++;
        showToast('Từ khóa chưa chính xác. Gợi ý: Hãy quan sát các chữ cái giao nhau ở các hàng ngang đã đúng!');
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      els.submitKeywordBtn.disabled = false;
      els.submitKeywordBtn.textContent = 'Gửi';
    }
  }

  els.submitKeywordBtn.addEventListener('click', submitKeyword);
  els.keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitKeyword();
  });

  // ── Init ──
  restoreParticipant();
  fetchCrossword();
});
