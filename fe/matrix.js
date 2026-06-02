document.addEventListener('DOMContentLoaded', () => {
  const puzzleGrid = document.getElementById('puzzle-grid');
  const keywordList = document.getElementById('keyword-list');
  const roundQuote = document.getElementById('roundQuote');
  const roundKicker = document.getElementById('roundKicker');
  const failCounter = document.getElementById('failCounter');
  const hintBtn = document.getElementById('hintBtn');
  const navPlayerName = document.getElementById('navPlayerName');
  
  const playPanel = document.getElementById('playPanel');
  const completionPanel = document.getElementById('completionPanel');
  const toast = document.getElementById('matrixToast');
  const hintModal = document.getElementById('hintModal');
  const hintCancelBtn = document.getElementById('hintCancelBtn');
  const hintConfirmBtn = document.getElementById('hintConfirmBtn');

  let participant = null;
  let gameData = null;
  let currentRoundIndex = 0;
  let foundWords = [];
  let foundCells = [];
  let failCount = 0;
  let hintCount = 0;
  let startTime = null;

  let toastTimeout = null;
  
  function showToast(msg) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = msg;
    toast.classList.add('is-show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('is-show');
    }, 3000);
  }

  function getParticipant() {
    try {
      return JSON.parse(sessionStorage.getItem('currentParticipant')) || 
             JSON.parse(sessionStorage.getItem('sacmaudisan_participant'));
    } catch(e) {
      return null;
    }
  }

  function saveFailCount() {
    sessionStorage.setItem('matrixFailCount', failCount);
  }

  function loadFailCount() {
    const saved = sessionStorage.getItem('matrixFailCount');
    if (saved !== null) {
      failCount = parseInt(saved, 10) || 0;
    }
  }

  function updateFailCounter() {
    failCounter.textContent = `Lỗi: ${failCount}`;
  }

  async function init() {
    participant = getParticipant();
    if (!participant) {
      window.location.replace('/auth');
      return;
    }
    navPlayerName.title = participant.fullName || participant.studentId;
    
    loadFailCount();
    updateFailCounter();

    try {
      const res = await fetch('/api/game/matrix');
      if (!res.ok) throw new Error('Failed to load matrix data');
      gameData = await res.json();
      
      // Check if participant already completed
      if (participant.completedRoundIds && participant.completedRoundIds.includes('matrix-trung-hieu')) {
        showCompletion();
        return;
      }
      
      startTime = Date.now();
      loadRound(0);
    } catch(err) {
      console.error(err);
      showToast('Lỗi tải dữ liệu. Vui lòng thử lại sau.');
    }
  }

  function loadRound(index) {
    if (index >= gameData.rounds.length) {
      finishGame();
      return;
    }
    
    currentRoundIndex = index;
    foundWords = [];
    foundCells = [];
    const round = gameData.rounds[currentRoundIndex];
    
    roundKicker.textContent = `Ma trận ${round.roundNumber}: ${round.category}`;
    roundQuote.textContent = `"${round.quote}"`;
    
    renderGrid(round.grid);
    renderKeywords(round.keywords);
  }

  function renderGrid(gridArray) {
    puzzleGrid.innerHTML = '';
    const cols = gridArray[0].length;
    puzzleGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    
    let fontSizeClass = 'text-headline-md';
    if (cols >= 12) fontSizeClass = 'text-body-lg';
    if (cols >= 15) fontSizeClass = 'text-body-md';

    const flatGrid = gridArray.flat();
    flatGrid.forEach((char, i) => {
      const cell = document.createElement('div');
      cell.className = `grid-cell bg-surface-container-highest flex items-center justify-center font-headline-md ${fontSizeClass} text-on-surface font-bold cursor-pointer rounded`;
      cell.textContent = char;
      cell.dataset.index = i;
      
      cell.addEventListener('click', () => handleCellClick(i, cell));
      puzzleGrid.appendChild(cell);
    });
  }

  function renderKeywords(keywords) {
    keywordList.innerHTML = '';
    keywords.forEach(kw => {
      const li = document.createElement('li');
      li.className = 'font-label-sm text-label-sm text-on-surface flex items-center gap-3 bg-surface p-3 border border-outline-variant rounded transition-all duration-300';
      li.id = `kw-${kw.word}`;
      
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined text-outline-variant';
      icon.style.fontVariationSettings = "'FILL' 0";
      icon.textContent = 'radio_button_unchecked';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = kw.word.toUpperCase();
      textSpan.className = 'tracking-widest font-bold';
      
      li.appendChild(icon);
      li.appendChild(textSpan);
      keywordList.appendChild(li);
    });
  }

  async function handleCellClick(index, cellDiv) {
    if (cellDiv.classList.contains('locked')) return;
    if (foundCells.includes(index)) return;

    const roundData = gameData.rounds[currentRoundIndex];

    try {
      const res = await fetch('/api/game/matrix/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: roundData.roundNumber,
          cellIndex: index
        })
      });
      const data = await res.json();
      
      if (data.match) {
        if (!foundWords.includes(data.word)) {
          foundWords.push(data.word);
          data.cells.forEach(idx => {
            if (!foundCells.includes(idx)) foundCells.push(idx);
            const targetCell = puzzleGrid.children[idx];
            targetCell.classList.add('selected', 'locked');
          });
          
          const kwEl = document.getElementById(`kw-${data.word}`);
          if (kwEl) {
            kwEl.classList.add('keyword-found', 'bg-surface-container');
            const icon = kwEl.querySelector('.material-symbols-outlined');
            icon.textContent = 'check_circle';
            icon.style.fontVariationSettings = "'FILL' 1";
            icon.classList.replace('text-outline-variant', 'text-secondary');
          }
          
          showToast(`Tìm thấy từ khóa: ${data.word.toUpperCase()}`);
          
          if (foundWords.length === roundData.keywords.length) {
            setTimeout(() => {
              showToast(`Hoàn thành Ma trận ${roundData.roundNumber}!`);
              setTimeout(() => {
                loadRound(currentRoundIndex + 1);
              }, 1500);
            }, 500);
          }
        }
      } else {
        // Wrong click
        cellDiv.classList.add('wrong-cell');
        setTimeout(() => {
          cellDiv.classList.remove('wrong-cell');
        }, 500);
        
        failCount++;
        saveFailCount();
        updateFailCounter();
        
        showToast('Ký tự không thuộc từ khóa nào (-3 điểm).');
      }
    } catch(err) {
      console.error(err);
      showToast('Đã có lỗi xảy ra.');
    }
  }

  hintBtn.addEventListener('click', () => {
    hintModal.classList.remove('hidden');
    hintModal.classList.add('flex');
  });

  hintCancelBtn.addEventListener('click', () => {
    hintModal.classList.add('hidden');
    hintModal.classList.remove('flex');
  });

  hintConfirmBtn.addEventListener('click', async () => {
    hintModal.classList.add('hidden');
    hintModal.classList.remove('flex');
    
    hintBtn.disabled = true;
    const originalText = hintBtn.innerHTML;
    hintBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Đang tìm...';
    
    try {
      const roundData = gameData.rounds[currentRoundIndex];
      const res = await fetch('/api/game/matrix/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: roundData.roundNumber,
          foundWords: foundWords
        })
      });
      const data = await res.json();
      
      if (data.hintIndex !== null) {
        hintCount++;
        const hintCell = puzzleGrid.children[data.hintIndex];
        hintCell.style.animation = 'none';
        hintCell.offsetHeight; // trigger reflow
        hintCell.style.animation = 'shake 0.5s ease-in-out 3';
        hintCell.style.backgroundColor = '#f0c100'; // highlight briefly
        setTimeout(() => {
          hintCell.style.backgroundColor = '';
          hintCell.style.animation = '';
        }, 1500);
        showToast('Gợi ý đã được hiển thị trên ma trận!');
      } else {
        showToast('Bạn đã tìm hết các từ khóa rồi!');
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể lấy gợi ý.');
    } finally {
      hintBtn.innerHTML = originalText;
      hintBtn.disabled = false;
    }
  });



  function showCompletion() {
    playPanel.classList.add('hidden');
    completionPanel.classList.remove('hidden');
    completionPanel.classList.add('flex');
  }

  async function finishGame() {
    try {
      const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const res = await fetch('/api/submit/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          duration: duration,
          hintUsedCount: hintCount,
          failCount: failCount
        })
      });
      const data = await res.json();
      if (data.completed) {
        if (data.participant) {
          sessionStorage.setItem('currentParticipant', JSON.stringify(data.participant));
        }
        showCompletion();
      }
    } catch(err) {
      console.error(err);
      showToast('Không thể lưu kết quả. Vui lòng thử lại.');
    }
  }

  init();
});
