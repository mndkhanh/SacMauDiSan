document.addEventListener('DOMContentLoaded', () => {
  const state = {
    data: null,
    participant: null,
    activeStageIndex: 0, // 0: stageA, 1: stageB, 2: stageC, 3: stageD
    stagesKeys: ['stageA', 'stageB', 'stageC', 'stageD'],
    answers: {
      stageA: '',
      stageB: '',
      stageC: '',
      stageD: [] // Array of event items
    },
    selectedEventIdx: null, // Index of the currently selected event for click-to-swap
    stageFails: 0,
    failCount: 0,
    hintUsedCount: 0,
    startTime: null,
    stageCleared: {
      stageA: false,
      stageB: false,
      stageC: false,
      stageD: false
    },
    toastTimer: null
  };

  const els = {
    navPlayerName: document.getElementById('navPlayerName'),
    stepBar: document.getElementById('step-bar'),
    stageStepBadge: document.getElementById('stageStepBadge'),
    stageInstruction: document.getElementById('stageInstruction'),
    stageBody: document.getElementById('stage-body'),
    stageInputArea: document.getElementById('stage-input-area'),
    hintBtn: document.getElementById('hintBtn'),
    submitStageBtn: document.getElementById('submitStageBtn'),
    stageContextBox: document.getElementById('stage-context-box'),
    stageContextText: document.getElementById('stageContextText'),
    playPanel: document.getElementById('playPanel'),
    completionPanel: document.getElementById('completionPanel'),
    completionMsg: document.getElementById('completionMsg'),
    finalScoreVal: document.getElementById('finalScoreVal'),
    toast: document.getElementById('challengeToast')
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

  // ── Fetch Challenge Data ──
  async function fetchChallenge() {
    try {
      const res = await fetch('/api/game/challenge');
      if (!res.ok) throw new Error('Không thể tải câu hỏi thử thách.');
      state.data = await res.json();
      
      // Set initial order for stageD (shuffled so player has to sort them)
      const events = [...state.data.stages.stageD.events];
      shuffleEvents(events);
      state.answers.stageD = events;
      
      state.startTime = Date.now();
      showStage(0);
    } catch (err) {
      showToast(err.message);
      console.error(err);
    }
  }

  // Shuffle helper that ensures items are not in correct chronological order
  function shuffleEvents(array) {
    if (array.length <= 1) return;
    const sortedIds = array.map(e => e.id).join(',');
    let isSorted = true;
    let attempts = 0;
    while (isSorted && attempts < 100) {
      attempts++;
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      isSorted = array.map(e => e.id).join(',') === sortedIds;
    }
  }

  // ── Show Stage View ──
  function showStage(index) {
    state.activeStageIndex = index;
    state.stageFails = 0;
    state.selectedEventIdx = null; // Reset click-to-swap selection
    els.hintBtn.classList.add('hidden');
    els.stageContextBox.classList.add('hidden');

    const key = state.stagesKeys[index];
    const stage = state.data.stages[key];
    
    // 1. Update step nodes in bar
    const pct = (index / (state.stagesKeys.length - 1)) * 100;
    els.stepBar.style.width = `${pct}%`;
    
    for (let i = 0; i < state.stagesKeys.length; i++) {
      const node = document.getElementById(`step-node-${i}`);
      if (i < index) {
        node.className = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-green-600 text-white border-2 border-green-600";
        node.innerHTML = '<span class="material-symbols-outlined text-sm font-bold">check</span>';
      } else if (i === index) {
        node.className = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-primary text-on-primary border-2 border-primary";
        node.textContent = String.fromCharCode(65 + i);
      } else {
        node.className = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-surface-variant text-on-surface-variant border-2 border-surface-variant";
        node.textContent = String.fromCharCode(65 + i);
      }
    }

    // 2. Set Badges & Titles
    const badges = {
      stageA: 'CHẶNG 1/4: NHÌN HÌNH ĐOÁN ĐỊA DANH',
      stageB: 'CHẶNG 2/4: GIẢI MÃ ĐOẠN THƠ',
      stageC: 'CHẶNG 3/4: CON SỐ LỊCH SỬ',
      stageD: 'CHẶNG 4/4: TRÌNH TỰ THỜI GIAN'
    };
    els.stageStepBadge.textContent = badges[key];
    els.stageInstruction.textContent = stage.instruction;

    // 3. Render Body & Inputs based on Stage type
    renderStageBody(key, stage);
    renderStageInput(key, stage);

    // 4. Update check button text
    if (state.stageCleared[key]) {
      showContextBox(stage.context);
      els.submitStageBtn.textContent = (index === 3) ? 'Hoàn thành thử thách' : 'Đi tiếp chặng tiếp theo';
    } else {
      els.submitStageBtn.textContent = 'Kiểm tra đáp án';
    }
  }

  // Helper to handle dragging source element
  let dragSrcEl = null;

  // ── Render Body Content of Stage ──
  function renderStageBody(key, stage) {
    if (key === 'stageA') {
      els.stageBody.innerHTML = `
        <div class="w-full max-w-lg overflow-hidden border border-outline-variant shadow-inner mb-2 bg-surface-container-low">
          <img src="${stage.image}" alt="Historical image" class="w-full h-64 object-cover">
        </div>
      `;
    } else if (key === 'stageB') {
      const isCleared = state.stageCleared.stageB;
      const poem = stage.poem;
      
      els.stageBody.innerHTML = `
        <div class="w-full max-w-lg bg-surface-container-high border border-outline p-6 md:p-8 italic font-serif text-lg leading-relaxed shadow-inner relative mb-6">
          <div class="absolute top-2 left-4 text-primary text-3xl font-bold opacity-10">“</div>
          <div class="absolute bottom-0 right-4 text-primary text-3xl font-bold opacity-10">”</div>
          <div class="flex flex-col gap-4">
            ${poem.map((line, idx) => {
              const firstChar = line.charAt(0);
              const restOfLine = line.slice(1);
              const charVal = state.answers.stageB[idx] || '';
              return `
                <div class="flex items-center gap-4">
                  <input type="text" class="poem-letter-input w-10 h-10 border-2 border-primary bg-transparent text-center font-bold text-lg text-primary uppercase outline-none focus:border-tertiary focus:ring-0" 
                         maxlength="1" 
                         data-idx="${idx}" 
                         value="${escapeHTML(charVal)}" 
                         ${isCleared ? 'disabled' : ''}>
                  <p class="text-left font-serif text-base md:text-lg leading-relaxed not-italic text-on-surface">
                    <span class="text-outline-variant opacity-40 select-none mr-1 font-bold italic font-serif">${firstChar}</span>${restOfLine}
                  </p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Word Blank for Stage B -->
        <div class="flex items-center justify-center gap-2 mt-4">
          <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mr-2">Từ khóa:</span>
          ${poem.map((_, idx) => {
            const charVal = state.answers.stageB[idx] || '';
            return `
              <input type="text" class="word-blank-input w-12 h-12 border-2 border-primary bg-transparent text-center font-bold text-xl text-primary uppercase outline-none focus:border-tertiary focus:ring-0" 
                     maxlength="1" 
                     data-idx="${idx}" 
                     value="${escapeHTML(charVal)}" 
                     ${isCleared ? 'disabled' : ''}>
            `;
          }).join('')}
        </div>
      `;

      if (isCleared) return;

      const poemInputs = els.stageBody.querySelectorAll('.poem-letter-input');
      const wordInputs = els.stageBody.querySelectorAll('.word-blank-input');

      const updateStageBAnswer = () => {
        const chars = [];
        wordInputs.forEach((input, idx) => {
          chars[idx] = input.value.trim().toUpperCase();
        });
        state.answers.stageB = chars.join('');
      };

      poemInputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
          const val = input.value.toUpperCase();
          input.value = val;
          wordInputs[idx].value = val;
          updateStageBAnswer();
          
          if (val && idx < poemInputs.length - 1) {
            poemInputs[idx + 1].focus();
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value && idx > 0) {
            poemInputs[idx - 1].focus();
          } else if (e.key === 'Enter') {
            checkAnswer();
          }
        });
      });

      wordInputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
          const val = input.value.toUpperCase();
          input.value = val;
          poemInputs[idx].value = val;
          updateStageBAnswer();
          
          if (val && idx < wordInputs.length - 1) {
            wordInputs[idx + 1].focus();
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value && idx > 0) {
            wordInputs[idx - 1].focus();
          } else if (e.key === 'Enter') {
            checkAnswer();
          }
        });
      });
    } else if (key === 'stageC') {
      const isCleared = state.stageCleared.stageC;
      const text = stage.question;
      const parts = text.split('____');
      if (parts.length > 1) {
        els.stageBody.innerHTML = `
          <div class="w-full max-w-lg bg-surface-container-high border border-outline p-8 text-center shadow-inner relative flex flex-col items-center justify-center min-h-[160px]">
            <span class="material-symbols-outlined text-secondary text-5xl mb-4">help_center</span>
            <p class="font-headline-md text-headline-md text-primary leading-loose text-center">
              ${escapeHTML(parts[0])}
              <input type="text" id="stageAnswerInput" class="w-32 p-2 border-b-2 border-primary bg-transparent text-center font-bold text-xl outline-none text-primary focus:border-tertiary focus:ring-0 mx-2" placeholder="____" value="${escapeHTML(state.answers.stageC)}" ${isCleared ? 'disabled' : ''}>
              ${escapeHTML(parts[1])}
            </p>
          </div>
        `;
        const input = document.getElementById('stageAnswerInput');
        if (input) {
          input.addEventListener('input', () => {
            state.answers.stageC = input.value;
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkAnswer();
          });
        }
      } else {
        els.stageBody.innerHTML = `
          <div class="w-full max-w-lg bg-surface-container-high border border-outline p-8 text-center shadow-inner relative flex flex-col items-center justify-center min-h-[160px]">
            <span class="material-symbols-outlined text-secondary text-5xl mb-4">help_center</span>
            <p class="font-headline-md text-headline-md text-primary leading-normal">${stage.question}</p>
          </div>
        `;
      }
    } else if (key === 'stageD') {
      renderChronologicalEvents();
    }
  }

  // ── Render Chronological Order Lists (Stage D) ──
  function renderChronologicalEvents() {
    const events = state.answers.stageD;
    const isCleared = state.stageCleared.stageD;
    const selIdx = state.selectedEventIdx;

    els.stageBody.innerHTML = `
      <div class="w-full flex flex-col gap-3" id="events-list">
        ${events.map((e, idx) => {
          const isSelected = selIdx === idx;
          const borderClass = isSelected ? 'border-primary bg-secondary-container/10' : 'border-outline hover:border-primary';
          return `
            <div class="flex items-center justify-between p-4 bg-surface border ${borderClass} transition-all rounded shadow-sm drag-item" 
                 draggable="${!isCleared ? 'true' : 'false'}" 
                 data-idx="${idx}" 
                 data-id="${e.id}">
              <div class="flex items-center gap-3 pointer-events-none">
                <span class="w-7 h-7 bg-primary text-on-primary font-bold text-xs flex items-center justify-center rounded-full">${idx + 1}</span>
                <p class="font-body-md text-sm text-on-surface leading-normal pr-4 pointer-events-none">${e.text}</p>
              </div>
              ${!isCleared ? `
                <div class="flex items-center gap-2 text-outline-variant pointer-events-none">
                  <span class="material-symbols-outlined">drag_indicator</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${!isCleared ? `
        <p class="text-xs text-on-surface-variant italic mt-3 text-center">
          💡 Mẹo: Bạn có thể kéo thả để đổi vị trí, hoặc click chọn hai mục để hoán đổi vị trí của chúng.
        </p>
      ` : ''}
    `;

    if (isCleared) return;

    // Add drag-and-drop and click event listeners
    const items = els.stageBody.querySelectorAll('.drag-item');
    items.forEach(item => {
      // Click selection / swap listener
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx, 10);
        if (state.selectedEventIdx === null) {
          state.selectedEventIdx = idx;
          renderChronologicalEvents();
        } else if (state.selectedEventIdx === idx) {
          state.selectedEventIdx = null;
          renderChronologicalEvents();
        } else {
          // Swap items
          const temp = events[state.selectedEventIdx];
          events[state.selectedEventIdx] = events[idx];
          events[idx] = temp;
          state.selectedEventIdx = null;
          renderChronologicalEvents();
        }
      });

      // Drag listener
      item.addEventListener('dragstart', (e) => {
        item.style.opacity = '0.4';
        dragSrcEl = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.idx);
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        items.forEach(it => {
          it.classList.remove('border-primary-container', 'bg-secondary-container/10');
        });
      });

      item.addEventListener('dragover', (e) => {
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
      });

      item.addEventListener('dragenter', () => {
        if (item !== dragSrcEl) {
          item.classList.add('border-primary-container', 'bg-secondary-container/10');
        }
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('border-primary-container', 'bg-secondary-container/10');
      });

      item.addEventListener('drop', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const srcIdx = dragSrcEl ? parseInt(dragSrcEl.dataset.idx, 10) : parseInt(e.dataTransfer.getData('text/plain'), 10);
        const targetIdx = parseInt(item.dataset.idx, 10);
        
        if (!isNaN(srcIdx) && !isNaN(targetIdx) && srcIdx !== targetIdx) {
          // Reorder events array
          const draggedItem = events[srcIdx];
          events.splice(srcIdx, 1);
          events.splice(targetIdx, 0, draggedItem);
          
          state.selectedEventIdx = null; // clear selection if any
          renderChronologicalEvents();
        }
        return false;
      });
    });
  }

  // ── Render Input Controls depending on Stage ──
  function renderStageInput(key, stage) {
    const isCleared = state.stageCleared[key];
    if (key === 'stageB' || key === 'stageD' || (key === 'stageC' && stage.question.includes('____'))) {
      els.stageInputArea.innerHTML = '';
      return;
    }

    els.stageInputArea.innerHTML = `
      <div class="w-full flex flex-col gap-2">
        <input type="text" id="stageAnswerInput" class="w-full p-4 border border-outline-variant focus:border-primary text-center font-bold text-lg outline-none tracking-wide" placeholder="Nhập đáp án của bạn..." value="${escapeHTML(state.answers[key])}" ${isCleared ? 'disabled' : ''}>
      </div>
    `;

    const input = document.getElementById('stageAnswerInput');
    if (input) {
      input.addEventListener('input', () => {
        state.answers[key] = input.value;
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkAnswer();
      });
    }
  }

  // ── Display Context Facts after correct ──
  function showContextBox(text) {
    if (text) {
      els.stageContextBox.classList.remove('hidden');
      els.stageContextText.textContent = text;
    }
  }

  // ── Verify Current Stage Answer ──
  async function checkAnswer() {
    const key = state.stagesKeys[state.activeStageIndex];
    const stage = state.data.stages[key];
    
    // If already cleared, click leads to Next Stage or Completion screen
    if (state.stageCleared[key]) {
      if (state.activeStageIndex < 3) {
        showStage(state.activeStageIndex + 1);
      } else {
        triggerCompletion();
      }
      return;
    }

    const duration = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
    const payload = {
      stageId: key,
      participantId: state.participant?.id,
      duration: duration,
      hintUsedCount: state.hintUsedCount,
      failCount: state.failCount
    };

    if (key === 'stageA' || key === 'stageB' || key === 'stageC') {
      let val = '';
      if (key === 'stageB') {
        const wordInputs = els.stageBody.querySelectorAll('.word-blank-input');
        if (wordInputs.length > 0) {
          const chars = [];
          wordInputs.forEach((input, idx) => {
            chars[idx] = input.value.trim().toUpperCase();
          });
          val = chars.join('');
        } else {
          val = (state.answers.stageB || '').trim().toUpperCase();
        }
      } else {
        const input = document.getElementById('stageAnswerInput');
        val = (input ? input.value : state.answers[key] || '').trim().toUpperCase();
      }

      if (!val) {
        showToast('Vui lòng điền đáp án.');
        return;
      }
      payload.answer = val;
      state.answers[key] = val; // sync back to state
    } else if (key === 'stageD') {
      payload.order = state.answers.stageD.map(e => e.id);
    }

    try {
      els.submitStageBtn.disabled = true;
      els.submitStageBtn.textContent = 'Đang kiểm tra...';

      const res = await fetch('/api/submit/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Kiểm tra thất bại.');

      if (result.correct) {
        state.stageCleared[key] = true;
        showToast('Đáp án hoàn toàn chính xác!');
        
        // Update participant session state on final stage completion
        if (key === 'stageD' && result.participant) {
          const AUTH_KEY = 'sacmaudisan_participant';
          const GAME_KEY = 'currentParticipant';
          sessionStorage.setItem(AUTH_KEY, JSON.stringify(result.participant));
          sessionStorage.setItem(GAME_KEY, JSON.stringify(result.participant));
        }

        showContextBox(result.context || stage.context);
        
        // Disable inputs
        const input = document.getElementById('stageAnswerInput');
        if (input) input.disabled = true;
        if (key === 'stageB') {
          els.stageBody.querySelectorAll('.poem-letter-input, .word-blank-input').forEach(inp => inp.disabled = true);
        }
        if (key === 'stageD') renderChronologicalEvents(); // Disable arrows
        
        els.submitStageBtn.textContent = (state.activeStageIndex === 3) ? 'Hoàn thành thử thách' : 'Đi tiếp chặng tiếp theo';
        els.hintBtn.classList.add('hidden');
      } else {
        state.stageFails++;
        state.failCount++;
        showToast('Đáp án chưa chính xác. Hãy thử lại!');
        if (state.stageFails >= 2) {
          els.hintBtn.classList.remove('hidden');
        }
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      els.submitStageBtn.disabled = false;
      const key = state.stagesKeys[state.activeStageIndex];
      if (!state.stageCleared[key]) {
        els.submitStageBtn.textContent = 'Kiểm tra đáp án';
      }
    }
  }

  // ── Trigger Hints ──
  function triggerHint() {
    const key = state.stagesKeys[state.activeStageIndex];
    const stage = state.data.stages[key];
    if (!stage.hint) return;

    state.hintUsedCount++;
    window.alert(`💡 GỢI Ý CHẶNG ${state.activeStageIndex + 1}:\n\n${stage.hint}\n\n(Lưu ý: Mỗi lần xem gợi ý sẽ trừ 25 điểm thưởng hoàn thành).`);
    els.hintBtn.classList.add('hidden'); // Hide hint button after showing
  }

  // ── Finish & Completion overlay logic ──
  function triggerCompletion() {
    const baseScore = 200;
    const finalScore = Math.max(80, baseScore - state.hintUsedCount * 25 - state.failCount * 5);
    
    els.playPanel.style.display = 'none';
    els.completionPanel.classList.remove('hidden');
    els.completionPanel.classList.add('flex');
    
    els.completionMsg.textContent = `Chúc mừng bạn đã vượt qua tất cả 4 chặng thử thách liên hoàn "Thử Thách Trị Quốc, Bình Thiên Hạ". Bạn đã dùng ${state.hintUsedCount} gợi ý và trả lời sai ${state.failCount} lần trong suốt cuộc chơi.`;
    els.finalScoreVal.textContent = `Điểm đạt được: ${finalScore}/200`;

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

  els.submitStageBtn.addEventListener('click', checkAnswer);
  els.hintBtn.addEventListener('click', triggerHint);

  // ── Init ──
  restoreParticipant();
  fetchChallenge();
});
