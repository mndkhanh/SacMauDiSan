# Sắc Màu Di Sản — Project Instruction for AI Reference

## 1. Project Overview

**Project name:** Sắc Màu Di Sản
**Theme:** Introduce Hồ Chí Minh (Ho Chi Minh) — his life, ideology, and great contributions to Vietnam.
**Target audience:** University students (FPT University context).
**Language:** Vietnamese (UI, content, labels, messages).
**Purpose:** An interactive educational web experience where students learn about Hồ Chí Minh through a series of progressively harder mini-games.

---

## 2. Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no framework unless specified)
- **Backend:** Plain Node.js (`http` module, no Express) — same pattern as `phat-work/server.js`
- **Data storage:** JSON files in `data/` directory
- **No external npm dependencies** unless explicitly approved
- **Deploy target:** Render or Docker; Firebase Hosting for static assets if needed

---

## 3. Website Structure

### 3.1 Auth Page (Fake Auth — Data Capture Only)

- **Purpose:** Capture player identity before they enter the site. This is NOT real authentication — no password, no Firebase Auth for this flow.
- **Fields required:**
  - Họ và tên (Full name)
  - Mã số sinh viên / MSSV (Student code)
- **Behavior:**
  - On submit, save to backend (`participants.json` or equivalent)
  - Store player session in `localStorage` (participantId + name + studentCode)
  - Redirect to Landing Page after successful capture
- **Design note:** Should feel warm and welcoming, matching the Sắc Màu Di Sản key visual aesthetic

### 3.2 Landing Page

- **Purpose:** Introduce the project and Hồ Chí Minh before players enter games
- **Sections to include:**
  1. Hero banner with project name "Sắc Màu Di Sản" and key visual
  2. Brief introduction to the project mission
  3. Biography highlights of Hồ Chí Minh (birth, key milestones, legacy)
  4. Overview of his ideology (Tư tưởng Hồ Chí Minh)
  5. Call-to-action: Enter the game hub
- **Design:** Rich visuals, historical aesthetic, Vietnamese cultural color palette

### 3.3 Game Hub / Home

- **Purpose:** Central page listing all 4 games
- **Each game card shows:**
  - Game name and level badge (Level 1 / Level 2 / Level 3)
  - Short description
  - "Vào phòng chờ" (Enter Waiting Room) button
- **Games are sequential** — ideally unlock after completing the previous level (optional logic)

### 3.4 Waiting Room (before each game)

- **Purpose:** A pre-game lobby screen shown before any game starts
- **Contents:**
  - Game title and description
  - Rules / instructions for the upcoming game
  - Player's current info (name, MSSV)
  - "Bắt đầu" (Start) button to enter the game
- **Note:** This is a simple informational screen, not a multiplayer lobby

---

## 4. Games

### Game 1 — Quiz Dân Chủ (Level 1)

**Theme:** Democracy and civic knowledge related to Hồ Chí Minh and his ideology.
**Difficulty:** Easy — introductory level.
**Question format — 10 questions total:**

| # | Type | Count | Description |
|---|---|---|---|
| 1 | Multiple Choice (MC) | 7 | Each question has 4 answer options (A/B/C/D). Only 1 correct answer. |
| 2 | Fill in the Blank | 2 | A sentence with a blank; player types the missing word/phrase. Accept case-insensitive and trimmed answers. |
| 3 | Matching | 1 | Drag-and-drop or click-to-connect matching pairs (same mechanic as `phat-work`). 4 pairs per matching question. |

**Game flow:**
1. Questions are shown one at a time (or all at once — flexible)
2. Player submits answers
3. Backend checks answers (answers never exposed in frontend payload)
4. Show score and correct answers at the end
5. Mark round completed in backend for this player

**Data structure (game-data):**
```json
{
  "gameId": "quiz-dan-chu",
  "title": "Quiz Dân Chủ",
  "level": 1,
  "questions": [
    {
      "id": "q1",
      "type": "mc",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A"
    },
    {
      "id": "q8",
      "type": "fill",
      "question": "Hồ Chí Minh sinh năm ____.",
      "answer": "1890"
    },
    {
      "id": "q10",
      "type": "matching",
      "instruction": "Nối các khái niệm với định nghĩa đúng",
      "pairs": [
        { "id": "p1", "left": "Cần", "right": "Siêng năng, chăm chỉ" },
        { "id": "p2", "left": "Kiệm", "right": "Tiết kiệm, không lãng phí" },
        { "id": "p3", "left": "Liêm", "right": "Trong sạch, không tham nhũng" },
        { "id": "p4", "left": "Chính", "right": "Ngay thẳng, trung thực" }
      ]
    }
  ]
}
```

---

### Game 2 — Ma Trận Trung Với Nước, Hiếu Với Dân (Level 1)

**Theme:** A word-search / keyword-finding matrix game based on Hồ Chí Minh's ideology.
**Difficulty:** Easy-Medium — still Level 1 but requires more focus.

**Game mechanics:**
- Display a grid of letters (word search matrix)
- Player must find and highlight hidden keywords within the grid
- Keywords are hidden horizontally, vertically, or diagonally

**Question sets / categories (multiple keyword groups to find):**
1. **Bác Hồ keywords:** Find 4 keywords related to Hồ Chí Minh (e.g., tên gọi, địa danh, sự kiện)
2. **Tư tưởng cách mạng:** Find keywords related to his ideology about the socialist revolutionary person
3. Additional categories can be added (e.g., các phong trào, danh ngôn từ khóa)

**Randomization requirement:**
- Must have **multiple pre-built puzzle sets** (at least 3–5 sets per category)
- Each player session randomly picks one set → different people get different grids
- Prevents copying between players

**Data structure:**
```json
{
  "gameId": "ma-tran-trung-voi-nuoc",
  "title": "Ma Trận Trung Với Nước, Hiếu Với Dân",
  "level": 1,
  "puzzleSets": [
    {
      "setId": "set-1",
      "grid": [["N","G","U","Y","E","N"], ...],
      "keywords": ["NGUYEN", "AITQUOC", "BACBO"],
      "category": "Bác Hồ keywords"
    }
  ]
}
```

**Backend responsibility:**
- Serve a random puzzle set per session (track which set was given to which player)
- Validate found keywords server-side

---

### Game 3 — Ô Chữ Tu Thân, Chính Tâm (Level 2)

**Theme:** A crossword puzzle based on Hồ Chí Minh's moral teachings (Tu thân, Chính tâm).
**Difficulty:** Medium-Hard — Level 2, requires concentration and deeper knowledge.

**Game mechanics:**
- A crossword grid with numbered cells
- Each row/column is clued with a question (any question type — riddle, definition, quote completion, etc.)
- Player fills in answers letter by letter
- Questions can be:
  - Direct definitions ("Đức tính nào Bác Hồ đề cao nhất?")
  - Quote completions ("Không có gì quý hơn ____")
  - Riddles or descriptions
  - Historical facts
- Completing a row reveals a letter that contributes to a **hidden keyword** (the central vertical word of the crossword)

**Scoring:**
- Points per correct row
- Bonus for completing the hidden central keyword
- Time-based bonus (optional)

**Data structure:**
```json
{
  "gameId": "o-chu-tu-than",
  "title": "Ô Chữ Tu Thân, Chính Tâm",
  "level": 2,
  "grid": {
    "rows": [
      {
        "rowIndex": 1,
        "clue": "Đức tính siêng năng, chăm chỉ theo lời Bác",
        "answer": "CAN",
        "highlightCol": 1
      }
    ],
    "hiddenKeyword": "BACHO",
    "hiddenKeywordColIndex": 1
  }
}
```

---

### Game 4 — Thử Thách Trị Quốc, Bình Thiên Hạ (Level 3)

**Theme:** The hardest level — a chain of brain-teaser challenges about Hồ Chí Minh.
**Difficulty:** Hard — Level 3, competitive and challenging.
**Format:** Sequential challenge stages (liên hoàn — chain). Player completes stages one by one.

**Stage types:**

#### Stage A — Nhìn Hình Đoán Tên Người (Image → Name)
- Show a historical photo or illustration
- Player must type or select the name of the person/place/event shown
- Images: historical figures related to Hồ Chí Minh, revolutionary comrades, key locations

#### Stage B — Nhìn Đoạn Thơ Đoán Keyword (Poetry → Acronym Keyword)
- Show a poem or verse (đoạn thơ)
- The keyword is formed by the **first letters of each line** (acrostic)
- Player must identify the hidden keyword spelled out by the first letters
- First player (or first correct answer) wins this stage
- Example: If lines start with B-Á-C-H-Ồ → keyword is "BÁCHỒ"

#### Stage C — Đoán Số (Guess the Number)
- Historical numerical trivia questions about Hồ Chí Minh
- Examples:
  - "Chủ tịch Hồ Chí Minh đã sử dụng tổng cộng bao nhiêu tên gọi, bí danh và bút danh khác nhau?" (Answer: 174+)
  - "Bác Hồ đã đi qua bao nhiêu quốc gia trong cuộc đời hoạt động cách mạng?" (Answer: ~30)
  - "Hồ Chí Minh rời Việt Nam lần đầu năm nào?" (Answer: 1911)
- Player inputs a number; closest answer wins (Price Is Right style) or exact match required

#### Stage D — Other Creative Formats (extensible)
- **Nghe âm thanh đoán sự kiện:** Play an audio clip, guess the historical event
- **Sắp xếp thứ tự:** Put historical events in chronological order
- **Điền vào câu nói nổi tiếng:** Complete a famous quote by Hồ Chí Minh
- **Đoán địa danh:** Given a description or photo of a location, name it

**Chain mechanic:**
- Player must complete each stage to unlock the next
- Wrong answer = retry allowed (with hint after 2 fails)
- Completing all stages = "Thử thách hoàn thành" — recorded in backend

---

## 5. Backend API Convention

Follow the same pattern as `phat-work/server.js` — plain Node.js `http` module, no frameworks.

### Standard endpoints per game:

```
GET  /api/game/:gameId          → Return game data (sanitized, no answers)
POST /api/register              → Register/update participant
GET  /api/participants          → List all participants with progress
DELETE /api/participants/:id    → Remove a participant
POST /api/submit/:gameId        → Submit answers, get result
GET  /api/health                → Health check
```

### Answer validation rule:
- Answers are **never sent to the frontend** in game data responses
- Only the backend knows the correct answers
- Frontend sends player's answers → backend checks → returns result

---

## 6. Data Files

```
data/
├── participants.json        # All registered players and their game progress
├── game1-quiz.json          # Quiz Dân Chủ questions + answers
├── game2-matrix.json        # Ma Trận puzzle sets
├── game3-crossword.json     # Ô Chữ grid data
└── game4-challenge.json     # Thử Thách stages data
```

### Participant schema:
```json
{
  "id": "uuid",
  "fullName": "Nguyễn Văn A",
  "studentCode": "SE123456",
  "completedGames": {
    "quiz-dan-chu": { "completed": true, "score": 8, "total": 10, "completedAt": "ISO8601" },
    "ma-tran": { "completed": false },
    "o-chu": { "completed": false },
    "thu-thach": { "completed": false }
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## 7. UI / Design Guidelines

- **Color palette:** Inspired by Vietnamese heritage — deep reds, warm golds, earthy ochres, dark greens. Reference key visual `Sắc Màu Di Sản`.
- **Typography:** Vietnamese-friendly fonts (e.g., Be Vietnam Pro, Nunito, or system fonts)
- **Tone:** Respectful, educational, but engaging and gamified
- **Responsive:** Must work on both desktop and mobile
- **Accessibility:** Sufficient color contrast; readable font sizes (min 16px body)
- **Animations:** Subtle — card flips, confetti on completion, smooth transitions

---

## 8. Game Progression & Scoring

| Game | Level | Points possible |
|---|---|---|
| Quiz Dân Chủ | 1 | 100 |
| Ma Trận Trung Với Nước | 1 | 100 |
| Ô Chữ Tu Thân | 2 | 150 |
| Thử Thách Trị Quốc | 3 | 200 |
| **Total** | | **550** |

- Score is stored per player in `participants.json`
- Leaderboard can be shown in the admin/participants view
- Games do NOT need to be played in order (unless unlock logic is implemented)

---

## 9. File & Folder Convention

```
project-root/
├── .agents/
│   └── instruction.md        ← THIS FILE
├── phat-work/                ← Existing matching game (Game reference/inspiration)
│   ├── server.js
│   ├── public/
│   └── data/
├── sacmaudisan/              ← Main project (to be built)
│   ├── server.js
│   ├── public/
│   │   ├── index.html        ← Auth/landing entry point
│   │   ├── app.js
│   │   ├── styles.css
│   │   └── assets/
│   └── data/
│       ├── participants.json
│       ├── game1-quiz.json
│       ├── game2-matrix.json
│       ├── game3-crossword.json
│       └── game4-challenge.json
└── README.md
```

---

## 10. Key Rules for AI Agents Working on This Project

1. **Language:** All UI text, labels, messages, and content must be in **Vietnamese**.
2. **No framework:** Do not add React, Vue, or any frontend framework unless explicitly asked. Use vanilla JS.
3. **No external npm packages:** Backend must use only Node.js built-ins (`http`, `fs`, `path`, `crypto`).
4. **Security:** Never expose correct answers in API responses for game data endpoints.
5. **Randomization:** Game 2 (Ma Trận) must serve randomized puzzle sets per session.
6. **Fake auth only:** The auth page captures name + student code only. No real password, no Firebase Auth for this flow.
7. **Preserve phat-work:** Do not modify anything inside `phat-work/`. It is a reference implementation.
8. **Backend pattern:** Follow `phat-work/server.js` exactly — plain Node.js HTTP server, `sendJson()` helper, `parseBody()` for POST, atomic file writes with `.tmp` rename.
9. **Data integrity:** Always use atomic writes (write to `.tmp` then rename) when saving JSON files.
10. **Vietnamese encoding:** Ensure `charset=utf-8` on all HTTP responses and that JSON files are saved as UTF-8.
