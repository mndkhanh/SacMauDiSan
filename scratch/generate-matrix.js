const fs = require('fs');
const path = require('path');

const VIETNAMESE_CHARS = 'AÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬBCDĐEÉÈẺẼẸÊẾỀỂỄỆGHIÍÌỈĨỊKLMNOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢPQRSTUÚÙỦŨỤƯỨỪỬỮỰVXYÝỲỶỸỴ';

function getRandomChar() {
  return VIETNAMESE_CHARS[Math.floor(Math.random() * VIETNAMESE_CHARS.length)];
}

const DIRECTIONS = [
  [0, 1],   // right
  [0, -1],  // left
  [1, 0],   // down
  [-1, 0],  // up
  [1, 1],   // down-right
  [-1, -1], // up-left
  [1, -1],  // down-left
  [-1, 1]   // up-right
];

function canPlaceWord(grid, wordStr, row, col, dir, size) {
  for (let i = 0; i < wordStr.length; i++) {
    const r = row + i * dir[0];
    const c = col + i * dir[1];
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== null && grid[r][c] !== wordStr[i]) return false;
  }
  return true;
}

function placeWord(grid, wordStr, row, col, dir) {
  const cells = [];
  for (let i = 0; i < wordStr.length; i++) {
    const r = row + i * dir[0];
    const c = col + i * dir[1];
    grid[r][c] = wordStr[i];
    cells.push(r * grid.length + c);
  }
  return cells;
}

function generateRound(roundNum, category, quote, originalWords, size) {
  let success = false;
  let grid = [];
  let keywords = [];

  // Try multiple times in case it gets stuck
  for (let attempt = 0; attempt < 100; attempt++) {
    grid = Array(size).fill(null).map(() => Array(size).fill(null));
    keywords = [];
    let allPlaced = true;

    for (const originalWord of originalWords) {
      const wordStr = originalWord.replace(/\s+/g, '');
      let placed = false;

      // Try placing the word randomly up to 200 times
      for (let i = 0; i < 200; i++) {
        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, wordStr, row, col, dir, size)) {
          const cells = placeWord(grid, wordStr, row, col, dir);
          keywords.push({
            word: originalWord,
            cells: cells
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        allPlaced = false;
        break;
      }
    }

    if (allPlaced) {
      success = true;
      break;
    }
  }

  if (!success) {
    throw new Error(`Failed to place words for round ${roundNum} after many attempts.`);
  }

  // Fill empty spaces
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = getRandomChar();
      }
    }
  }

  return {
    roundNumber: roundNum,
    category,
    quote,
    grid,
    keywords
  };
}

const roundsDef = [
  {
    num: 1,
    category: "Cấp độ 1: Những giá trị cốt lõi",
    quote: "Trung với nước, hiếu với dân, nhiệm vụ nào cũng hoàn thành, khó khăn nào cũng vượt qua, kẻ thù nào cũng đánh thắng.",
    words: ["TRUNG VỚI NƯỚC", "HIẾU VỚI DÂN", "NHIỆM VỤ", "VƯỢT QUA"],
    size: 13
  },
  {
    num: 2,
    category: "Cấp độ 2: Ý chí vượt khó",
    quote: "Nhiệm vụ nào cũng hoàn thành, khó khăn nào cũng vượt qua, kẻ thù nào cũng đánh thắng.",
    words: ["NHIỆM VỤ", "VƯỢT QUA", "ĐÁNH THẮNG", "KHÓ KHĂN"],
    size: 14
  },
  {
    num: 3,
    category: "Cấp độ 3: Rèn luyện tự thân",
    quote: "Bồi dưỡng thế hệ cách mạng cho đời sau là một việc rất quan trọng và rất cần thiết.",
    words: ["Ý CHÍ", "KIÊN CƯỜNG", "TỰ CƯỜNG", "ĐOÀN KẾT", "ĐẠO ĐỨC"],
    size: 15
  }
];

const data = {
  title: "Ma Trận Trung - Hiếu",
  subtitle: "Tìm các giá trị cốt lõi về tinh thần Trung và Hiếu trong tư tưởng Hồ Chí Minh",
  rounds: roundsDef.map(def => generateRound(def.num, def.category, def.quote, def.words, def.size))
};

const outputPath = path.join(__dirname, '..', 'be', 'data', 'game2-matrix.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Successfully generated and wrote to ${outputPath}`);
