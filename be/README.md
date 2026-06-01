# phat-work — Backend

Node.js backend cho game **Cần Kiệm Liêm Chính Matching Game**.

## Chạy local

```bash
node server.js
# hoặc
npm start
```

Server mặc định chạy tại `http://localhost:3000`.  
Frontend tĩnh được serve từ `../phat-work-fe/` (hoặc thư mục `public/` nếu copy vào đây).

## Cấu trúc

```
phat-work-be/
├── server.js             # HTTP server + toàn bộ API routes
├── data/
│   ├── game-data.json    # Nội dung 10 vòng chơi + đáp án
│   └── participants.json # Dữ liệu người đăng ký (auto-generated)
├── package.json
├── Dockerfile
└── render.yaml
```

## API endpoints

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/game` | Lấy dữ liệu game (đã xáo trộn, không có đáp án) |
| POST | `/api/register` | Đăng ký người chơi |
| GET | `/api/participants` | Danh sách người đăng ký |
| DELETE | `/api/participants/:id` | Xóa người đăng ký |
| POST | `/api/submit` | Nộp đáp án và kiểm tra |

## Deploy

**Render:** `npm install` → `npm start`  
**Docker:** `docker build -t phat-work-be . && docker run -p 3000:3000 phat-work-be`

> **Lưu ý:** Khi chạy riêng backend, cần copy thư mục `phat-work-fe/` thành `public/`
> bên trong `phat-work-be/` để server có thể serve static files.
