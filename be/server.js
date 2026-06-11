const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// Serve the sibling fe/ folder in dev; fall back to local public/ for production deploys
const PUBLIC_DIR = fs.existsSync(path.join(ROOT, 'public'))
  ? path.join(ROOT, 'public')
  : path.join(ROOT, '..', 'fe');
const DATA_PATH = path.join(ROOT, 'data', 'game-data.json');
const PARTICIPANTS_PATH = path.join(ROOT, 'data', 'participants.json');
const QUIZ_DATA_PATH = path.join(ROOT, 'data', 'game1-quiz.json');
const MATRIX_DATA_PATH = path.join(ROOT, 'data', 'game2-matrix.json');
const CROSSWORD_DATA_PATH = path.join(ROOT, 'data', 'game3-crossword.json');
const CHALLENGE_DATA_PATH = path.join(ROOT, 'data', 'game4-challenge.json');

const attempts = []

function ensureJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2), 'utf8');
  }
}

function readGameData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function readQuizData() {
  return JSON.parse(fs.readFileSync(QUIZ_DATA_PATH, 'utf8'));
}

function readMatrixData() {
  return JSON.parse(fs.readFileSync(MATRIX_DATA_PATH, 'utf8'));
}

function readCrosswordData() {
  return JSON.parse(fs.readFileSync(CROSSWORD_DATA_PATH, 'utf8'));
}

function readChallengeData() {
  return JSON.parse(fs.readFileSync(CHALLENGE_DATA_PATH, 'utf8'));
}

function readParticipants() {
  ensureJsonFile(PARTICIPANTS_PATH, { participants: [] });
  const data = JSON.parse(fs.readFileSync(PARTICIPANTS_PATH, 'utf8'));
  const participants = Array.isArray(data.participants) ? data.participants : [];

  let dirty = false;
  participants.forEach(p => {
    let updated = false;
    if (!p.scores) {
      p.scores = {};
      updated = true;
    }
    if (!p.durations) {
      p.durations = {};
      updated = true;
    }
    p.completedRoundIds = p.completedRoundIds || [];
    p.completedRoundIds.forEach(roundId => {
      if (p.scores[roundId] === undefined) {
        let points = 0;
        if (roundId === 'quiz-dan-chu') points = 100;
        else if (roundId === 'matrix-trung-hieu') points = 100;
        else if (roundId === 'o-chu-tu-than') points = 150;
        else if (roundId === 'thu-thach-tri-quoc') points = 200;

        p.scores[roundId] = points;
        updated = true;
      }
      if (p.durations[roundId] === undefined) {
        p.durations[roundId] = 180; // default 3 minutes for legacy completes
        updated = true;
      }
    });
    const calculatedTotal = Object.values(p.scores).reduce((sum, s) => sum + s, 0);
    if (p.totalScore !== calculatedTotal) {
      p.totalScore = calculatedTotal;
      updated = true;
    }
    const calculatedDuration = Object.values(p.durations).reduce((sum, d) => sum + d, 0);
    if (p.totalDuration !== calculatedDuration) {
      p.totalDuration = calculatedDuration;
      updated = true;
    }
    if (updated) {
      dirty = true;
    }
  });

  if (dirty) {
    const tempPath = `${PARTICIPANTS_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({ participants }, null, 2), 'utf8');
    fs.renameSync(tempPath, PARTICIPANTS_PATH);
  }

  return participants;
}

function writeParticipants(participants) {
  const tempPath = `${PARTICIPANTS_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ participants }, null, 2), 'utf8');
  fs.renameSync(tempPath, PARTICIPANTS_PATH);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
  };
  return types[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = safeJoin(PUBLIC_DIR, pathname);

  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallback, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': pathname.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function cleanText(value, maxLength = 120) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeStudentId(value) {
  return cleanText(value, 40).toUpperCase();
}

function participantPublicPayload(participant, totalRounds) {
  const completedRoundIds = Array.isArray(participant.completedRoundIds) ? participant.completedRoundIds : [];
  return {
    id: participant.id,
    fullName: participant.fullName,
    studentId: participant.studentId,
    completedRoundIds,
    completedRoundCount: completedRoundIds.length,
    totalRounds,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
    lastCompletedAt: participant.lastCompletedAt || null
  };
}

function publicGamePayload() {
  const data = readGameData();
  return {
    ...data,
    rounds: data.rounds.map(round => ({
      id: round.id,
      order: round.order,
      category: round.category,
      instruction: round.instruction,
      source: round.source,
      leftCards: round.pairs.map(pair => ({
        id: pair.id,
        text: pair.left
      })),
      rightCards: shuffle(round.pairs.map(pair => ({
        id: pair.id,
        text: pair.right
      })))
    }))
  };
}

function publicQuizPayload() {
  const data = readQuizData();
  return {
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    questions: data.questions.map(q => {
      if (q.type === 'multiple-choice') {
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          context: q.context
        };
      } else if (q.type === 'fill-in-blank') {
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          context: q.context
        };
      } else if (q.type === 'matching') {
        return {
          id: q.id,
          type: q.type,
          instruction: q.instruction,
          leftCards: q.pairs.map(p => ({ id: p.id, text: p.left })),
          rightCards: shuffle(q.pairs.map(p => ({ id: p.id, text: p.right }))),
          context: q.context
        };
      }
    })
  };
}

function publicMatrixPayload() {
  const data = readMatrixData();
  return {
    title: data.title,
    subtitle: data.subtitle,
    rounds: data.rounds.map(r => ({
      roundNumber: r.roundNumber,
      category: r.category,
      quote: r.quote,
      grid: r.grid,
      keywords: r.keywords.map(kw => ({ word: kw.word }))
    }))
  };
}

function publicCrosswordPayload() {
  const data = readCrosswordData();
  return {
    title: data.title,
    subtitle: data.subtitle,
    hiddenKeywordColIndex: data.hiddenKeywordColIndex,
    hiddenKeywordLength: data.hiddenKeyword.length,
    rows: data.rows.map(r => ({
      id: r.id,
      rowIndex: r.rowIndex,
      clue: r.clue,
      answerLength: r.answer.length,
      highlightCol: r.highlightCol
    }))
  };
}

function publicChallengePayload() {
  const data = readChallengeData();
  return {
    title: data.title,
    subtitle: data.subtitle,
    stages: {
      stageA: {
        type: data.stages.stageA.type,
        instruction: data.stages.stageA.instruction,
        image: data.stages.stageA.image,
        hint: data.stages.stageA.hint,
        context: data.stages.stageA.context
      },
      stageB: {
        type: data.stages.stageB.type,
        instruction: data.stages.stageB.instruction,
        poem: data.stages.stageB.poem,
        hint: data.stages.stageB.hint,
        context: data.stages.stageB.context
      },
      stageC: {
        type: data.stages.stageC.type,
        instruction: data.stages.stageC.instruction,
        question: data.stages.stageC.question,
        hint: data.stages.stageC.hint,
        context: data.stages.stageC.context
      },
      stageD: {
        type: data.stages.stageD.type,
        instruction: data.stages.stageD.instruction,
        events: shuffle(data.stages.stageD.events.map(e => ({
          id: e.id,
          text: e.text
        }))),
        hint: data.stages.stageD.hint
      }
    }
  };
}

function checkCrossword(crosswordData, body) {
  if (body.type === 'row') {
    const row = crosswordData.rows.find(r => r.rowIndex === Number(body.rowIndex));
    if (!row) return { error: 'Không tìm thấy hàng này.' };

    const userAns = cleanText(body.answer).toUpperCase();
    const isCorrect = userAns === row.answer.toUpperCase();

    return {
      correct: isCorrect,
      context: isCorrect ? row.context : null
    };
  } else if (body.type === 'keyword') {
    const userKeyword = cleanText(body.keyword).toUpperCase();
    const isCorrect = userKeyword === crosswordData.hiddenKeyword.toUpperCase();

    return {
      correct: isCorrect
    };
  }

  return { error: 'Kiểu kiểm tra không hợp lệ.' };
}

function checkQuiz(quizData, userAnswers) {
  const results = {};
  let correctCount = 0;
  const totalCount = quizData.questions.length;

  for (const q of quizData.questions) {
    const userAnswer = userAnswers[q.id];
    let isCorrect = false;

    if (q.type === 'multiple-choice') {
      isCorrect = (userAnswer !== undefined && Number(userAnswer) === q.answer);
    } else if (q.type === 'fill-in-blank') {
      if (typeof userAnswer === 'string') {
        const cleaned = userAnswer.trim().toLowerCase();
        isCorrect = q.answers.some(ans => ans.trim().toLowerCase() === cleaned);
      }
    } else if (q.type === 'matching') {
      if (userAnswer && typeof userAnswer === 'object') {
        let matchingCorrect = true;
        for (const pair of q.pairs) {
          if (userAnswer[pair.id] !== pair.id) {
            matchingCorrect = false;
            break;
          }
        }
        isCorrect = matchingCorrect;
      }
    }

    if (isCorrect) {
      correctCount++;
    }
    results[q.id] = isCorrect;
  }

  const score = Math.round((correctCount / totalCount) * 100);

  return {
    score,
    correctCount,
    totalCount,
    results
  };
}

function checkRound(round, answers) {
  const total = round.pairs.length;
  const answerMap = answers && typeof answers === 'object' ? answers : {};
  const wrong = [];
  const correct = [];

  for (const pair of round.pairs) {
    const selectedRightId = answerMap[pair.id] || null;
    if (selectedRightId === pair.id) {
      correct.push({ leftId: pair.id, rightId: pair.id });
    } else {
      wrong.push({ leftId: pair.id, selectedRightId });
    }
  }

  return {
    completed: wrong.length === 0 && correct.length === total,
    score: correct.length,
    total,
    correct,
    wrong,
    message: wrong.length === 0
      ? 'Chính xác 100%. Bạn đã hoàn thành vòng chơi này.'
      : 'Chưa đúng 100%. Hãy nối lại các cặp chưa chính xác rồi kiểm tra lại.'
  };
}

const sseClients = new Set();

function getLeaderboardData() {
  const participants = readParticipants();
  return participants
    .map(p => ({
      id: p.id,
      fullName: p.fullName,
      studentId: p.studentId,
      scores: p.scores || {},
      durations: p.durations || {},
      totalScore: p.totalScore || 0,
      totalDuration: p.totalDuration || 0,
      completedRoundsCount: p.completedRoundIds ? p.completedRoundIds.length : 0,
      lastCompletedAt: p.lastCompletedAt || p.updatedAt || p.createdAt
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (a.totalDuration !== b.totalDuration) {
        return a.totalDuration - b.totalDuration;
      }
      return new Date(a.lastCompletedAt) - new Date(b.lastCompletedAt);
    });
}

function broadcastLeaderboard() {
  const data = getLeaderboardData();
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      console.error('SSE client write error:', e);
    }
  }
}

function registerParticipant(body) {
  const studentId = normalizeStudentId(body.studentId);
  const fullName = cleanText(body.fullName, 120);

  if (!studentId) {
    return { error: 'Vui lòng nhập MSSV.' };
  }

  const now = new Date().toISOString();
  const participants = readParticipants();
  let participant = participants.find(item => item.studentId === studentId);

  if (participant) {
    if (fullName) {
      participant.fullName = fullName;
    }
    participant.updatedAt = now;
    participant.completedRoundIds = Array.isArray(participant.completedRoundIds) ? participant.completedRoundIds : [];
  } else {
    if (!fullName) {
      return { error: 'Vui lòng nhập đủ họ tên và MSSV để tạo tài khoản mới.' };
    }
    participant = {
      id: crypto.randomUUID(),
      fullName,
      studentId,
      completedRoundIds: [],
      scores: {},
      durations: {},
      totalScore: 0,
      totalDuration: 0,
      createdAt: now,
      updatedAt: now,
      lastCompletedAt: null
    };
    participants.unshift(participant);
  }

  writeParticipants(participants);
  broadcastLeaderboard();
  return { participant };
}

function deleteParticipantById(participantId) {
  if (!participantId) return null;

  const participants = readParticipants();
  const index = participants.findIndex(item => item.id === participantId);
  if (index === -1) return null;

  const [deletedParticipant] = participants.splice(index, 1);
  writeParticipants(participants);
  broadcastLeaderboard();
  return deletedParticipant;
}

function markParticipantRoundCompleted(participantId, roundId, score = 0, duration = 0) {
  if (!participantId || !roundId) return null;

  const participants = readParticipants();
  const participant = participants.find(item => item.id === participantId);
  if (!participant) return null;

  const now = new Date().toISOString();
  participant.completedRoundIds = Array.isArray(participant.completedRoundIds) ? participant.completedRoundIds : [];
  participant.scores = participant.scores || {};
  participant.durations = participant.durations || {};

  if (!participant.completedRoundIds.includes(roundId)) {
    participant.completedRoundIds.push(roundId);
  }

  participant.scores[roundId] = Math.max(participant.scores[roundId] || 0, score);

  if (participant.durations[roundId] === undefined) {
    participant.durations[roundId] = duration;
  } else {
    participant.durations[roundId] = Math.min(participant.durations[roundId], duration || Infinity) || duration;
  }

  participant.totalScore = Object.values(participant.scores).reduce((sum, s) => sum + s, 0);
  participant.totalDuration = Object.values(participant.durations).reduce((sum, d) => sum + d, 0);

  participant.updatedAt = now;
  participant.lastCompletedAt = now;
  writeParticipants(participants);
  broadcastLeaderboard();
  return participant;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'sac-mau-di-san', time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/leaderboard/live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const initialData = getLeaderboardData();
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/game') {
    sendJson(res, 200, publicGamePayload());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/game/quiz') {
    sendJson(res, 200, publicQuizPayload());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/game/matrix') {
    sendJson(res, 200, publicMatrixPayload());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/game/crossword') {
    sendJson(res, 200, publicCrosswordPayload());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/game/challenge') {
    sendJson(res, 200, publicChallengePayload());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    try {
      const body = await parseBody(req);
      const result = registerParticipant(body);
      if (result.error) {
        sendJson(res, 400, { error: result.error });
        return;
      }
      const data = readGameData();
      sendJson(res, 200, {
        message: 'Đăng ký thành công. Bạn có thể bắt đầu chơi game.',
        participant: participantPublicPayload(result.participant, data.rounds.length)
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu đăng ký không hợp lệ.', detail: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/participants') {
    const data = readGameData();
    const participants = readParticipants()
      .map(item => participantPublicPayload(item, data.rounds.length))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    sendJson(res, 200, { participants });
    return;
  }


  if (req.method === 'DELETE' && url.pathname.startsWith('/api/participants/')) {
    const participantId = decodeURIComponent(url.pathname.replace('/api/participants/', '').trim());
    const deletedParticipant = deleteParticipantById(participantId);

    if (!deletedParticipant) {
      sendJson(res, 404, { error: 'Không tìm thấy người đăng ký cần xóa.' });
      return;
    }

    sendJson(res, 200, {
      message: 'Đã xóa thông tin người đăng ký.',
      deletedParticipantId: deletedParticipant.id
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submit') {
    try {
      const body = await parseBody(req);
      const data = readGameData();
      const round = data.rounds.find(item => item.id === body.roundId);

      if (!round) {
        sendJson(res, 404, { error: 'Không tìm thấy vòng chơi.' });
        return;
      }

      const result = checkRound(round, body.answers);
      let participant = null;
      if (result.completed && body.participantId) {
        participant = markParticipantRoundCompleted(body.participantId, round.id);
      }

      const attempt = {
        id: crypto.randomUUID(),
        participantId: body.participantId || null,
        roundId: round.id,
        completed: result.completed,
        score: result.score,
        total: result.total,
        createdAt: new Date().toISOString()
      };
      attempts.unshift(attempt);
      if (attempts.length > 200) attempts.pop();

      sendJson(res, 200, {
        ...result,
        attemptId: attempt.id,
        participant: participant ? participantPublicPayload(participant, data.rounds.length) : null
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.', detail: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submit/quiz') {
    try {
      const body = await parseBody(req);
      const quizData = readQuizData();
      const result = checkQuiz(quizData, body.answers || {});

      let participant = null;
      const passed = result.score >= 80;
      if (passed && body.participantId) {
        const duration = Number(body.duration) || 0;
        participant = markParticipantRoundCompleted(body.participantId, 'quiz-dan-chu', result.score, duration);
      }

      const attempt = {
        id: crypto.randomUUID(),
        participantId: body.participantId || null,
        roundId: 'quiz-dan-chu',
        completed: passed,
        score: result.correctCount,
        total: result.totalCount,
        createdAt: new Date().toISOString()
      };
      attempts.unshift(attempt);
      if (attempts.length > 200) attempts.pop();

      sendJson(res, 200, {
        ...result,
        passed,
        attemptId: attempt.id,
        participant: participant ? participantPublicPayload(participant, readGameData().rounds.length) : null
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.', detail: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/game/matrix/click') {
    try {
      const body = await parseBody(req);
      const data = readMatrixData();
      const roundData = data.rounds.find(r => r.roundNumber === Number(body.round));
      if (!roundData) {
        sendJson(res, 404, { error: 'Không tìm thấy vòng chơi.' });
        return;
      }

      const cellIndex = Number(body.cellIndex);
      const matchedKeyword = roundData.keywords.find(kw => kw.cells.includes(cellIndex));

      if (matchedKeyword) {
        sendJson(res, 200, {
          match: true,
          word: matchedKeyword.word,
          cells: matchedKeyword.cells
        });
      } else {
        sendJson(res, 200, {
          match: false
        });
      }
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/game/matrix/hint') {
    try {
      const body = await parseBody(req);
      const data = readMatrixData();
      const roundData = data.rounds.find(r => r.roundNumber === Number(body.round));
      if (!roundData) {
        sendJson(res, 404, { error: 'Không tìm thấy vòng chơi.' });
        return;
      }

      const foundWords = body.foundWords || [];
      const unfoundKeyword = roundData.keywords.find(kw => !foundWords.includes(kw.word));

      if (unfoundKeyword) {
        sendJson(res, 200, {
          hintIndex: unfoundKeyword.cells[0]
        });
      } else {
        sendJson(res, 200, {
          hintIndex: null
        });
      }
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submit/matrix') {
    try {
      const body = await parseBody(req);
      let participant = null;
      if (body.participantId) {
        const duration = Number(body.duration) || 0;
        const hintCount = Number(body.hintUsedCount) || 0;
        const failCount = Number(body.failCount) || 0;
        const matrixScore = Math.max(0, 100 - (hintCount * 10) - (failCount * 3));
        participant = markParticipantRoundCompleted(body.participantId, 'matrix-trung-hieu', matrixScore, duration);
      }

      const attempt = {
        id: crypto.randomUUID(),
        participantId: body.participantId || null,
        roundId: 'matrix-trung-hieu',
        completed: true,
        score: 100,
        total: 100,
        createdAt: new Date().toISOString()
      };
      attempts.unshift(attempt);
      if (attempts.length > 200) attempts.pop();

      sendJson(res, 200, {
        completed: true,
        participant: participant ? participantPublicPayload(participant, readGameData().rounds.length) : null
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submit/crossword') {
    try {
      const body = await parseBody(req);
      const crosswordData = readCrosswordData();
      const result = checkCrossword(crosswordData, body);

      if (result.error) {
        sendJson(res, 400, { error: result.error });
        return;
      }

      let participant = null;
      if (body.type === 'keyword' && result.correct && body.participantId) {
        const duration = Number(body.duration) || 0;
        const failCount = Number(body.failCount) || 0;
        const crosswordScore = Math.max(100, 150 - failCount * 10);
        participant = markParticipantRoundCompleted(body.participantId, 'o-chu-tu-than', crosswordScore, duration);
      }

      sendJson(res, 200, {
        ...result,
        participant: participant ? participantPublicPayload(participant, readGameData().rounds.length) : null
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submit/challenge') {
    try {
      const body = await parseBody(req);
      const challengeData = readChallengeData();
      const stageId = body.stageId;

      if (!challengeData.stages[stageId]) {
        sendJson(res, 404, { error: 'Không tìm thấy chặng này.' });
        return;
      }

      const stage = challengeData.stages[stageId];
      let correct = false;

      if (stageId === 'stageA' || stageId === 'stageB' || stageId === 'stageC') {
        const userAns = cleanText(body.answer).toUpperCase();
        correct = userAns === stage.answer.toUpperCase();
      } else if (stageId === 'stageD') {
        const userOrder = body.order;
        const correctOrder = [...stage.events]
          .sort((a, b) => a.year - b.year)
          .map(e => e.id);

        correct = Array.isArray(userOrder) &&
          userOrder.length === correctOrder.length &&
          userOrder.every((val, index) => val === correctOrder[index]);
      }

      let participant = null;
      if (stageId === 'stageD' && correct && body.participantId) {
        const duration = Number(body.duration) || 0;
        const hintCount = Number(body.hintUsedCount) || 0;
        const failCount = Number(body.failCount) || 0;
        const challengeScore = Math.max(80, 200 - hintCount * 25 - failCount * 5);
        participant = markParticipantRoundCompleted(body.participantId, 'thu-thach-tri-quoc', challengeScore, duration);
      }

      sendJson(res, 200, {
        correct,
        context: correct ? (stage.context || null) : null,
        participant: participant ? participantPublicPayload(participant, readGameData().rounds.length) : null
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/attempts') {
    sendJson(res, 200, { attempts });
    return;
  }

  sendJson(res, 404, { error: 'API endpoint không tồn tại.' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  // Serve game.html for the /game route
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/game') {
    const gamePath = path.join(PUBLIC_DIR, 'game.html');
    fs.readFile(gamePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Game not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve auth.html for the /auth route
  if (url.pathname === '/auth') {
    const authPath = path.join(PUBLIC_DIR, 'auth.html');
    fs.readFile(authPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Auth page not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve lobby.html for the /lobby route
  if (url.pathname === '/lobby') {
    const lobbyPath = path.join(PUBLIC_DIR, 'lobby.html');
    fs.readFile(lobbyPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Lobby not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve quiz.html for the /quiz route
  if (url.pathname === '/quiz') {
    const quizPath = path.join(PUBLIC_DIR, 'quiz.html');
    fs.readFile(quizPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Quiz not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve matrix.html for the /matrix route
  if (url.pathname === '/matrix') {
    const matrixPath = path.join(PUBLIC_DIR, 'matrix.html');
    fs.readFile(matrixPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Matrix not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve crossword.html for the /crossword route
  if (url.pathname === '/crossword') {
    const crosswordPath = path.join(PUBLIC_DIR, 'crossword.html');
    fs.readFile(crosswordPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Crossword not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve challenge.html for the /challenge route
  if (url.pathname === '/challenge') {
    const challengePath = path.join(PUBLIC_DIR, 'challenge.html');
    fs.readFile(challengePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Challenge not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  // Serve leaderboard.html for the /leaderboard route
  if (url.pathname === '/leaderboard') {
    const leaderboardPath = path.join(PUBLIC_DIR, 'leaderboard.html');
    fs.readFile(leaderboardPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Leaderboard not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  ensureJsonFile(PARTICIPANTS_PATH, { participants: [] });
  console.log(`Sắc màu di sản is running at http://localhost:${PORT}`);
});
