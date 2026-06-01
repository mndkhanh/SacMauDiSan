# Cần kiệm liêm chính — Matching Game

Website game nối cặp kiến thức dựa trên key visual đã cung cấp và nội dung trong các file `Session 24–28.pptx`.

## 1. Tính năng chính

- Giao diện landing page dùng key visual `Sắc màu di sản`.
- Có màn hình đăng ký trước khi chơi, gồm: Họ và tên, MSSV, Mã lớp.
- Game matching/nối cặp theo từng vòng, mỗi vòng gồm 4 cặp.
- Người chơi phải nối đúng 100% mới được tính hoàn thành vòng.
- Nếu trả lời sai, hệ thống hiển thị cặp sai và cho nối lại.
- Có tab `Thông tin người đăng ký` để xem danh sách người đã đăng ký và số vòng đã hoàn thành.
- Backend lưu số vòng đã hoàn thành của từng người chơi vào `data/participants.json`.
- Dấu tick trên vòng chơi chỉ hiển thị trong phiên chơi hiện tại. Khi refresh trang, tick sẽ biến mất, nhưng số vòng hoàn thành vẫn được lưu trong backend.
- Có backend API kiểm tra đáp án, tránh lộ đáp án đúng trực tiếp ở frontend.
- Không dùng thư viện ngoài, chỉ cần Node.js.

## 2. Cấu trúc thư mục

```text
can_kiem_liem_chinh_matching_game/
├── data/
│   ├── game-data.json         # Nội dung vòng chơi và đáp án chuẩn
│   └── participants.json      # Dữ liệu người đăng ký và số vòng đã hoàn thành
├── public/
│   ├── assets/
│   │   └── key-visual.png     # Key visual đã cung cấp
│   ├── app.js                 # Logic frontend
│   ├── index.html             # Giao diện chính
│   └── styles.css             # Style giao diện
├── server.js                  # Backend Node.js thuần
├── package.json
├── render.yaml                # File cấu hình deploy Render
├── Dockerfile                 # Deploy bằng Docker nếu cần
└── README.md
```

## 3. Chạy local

Yêu cầu: Node.js 18 trở lên.

```bash
npm install
npm start
```

Sau đó mở:

```text
http://localhost:3000
```

## 4. Luồng sử dụng

1. Người chơi mở website.
2. Người chơi nhập Họ và tên, MSSV, Mã lớp ở màn hình đăng ký.
3. Website lưu người chơi vào backend.
4. Người chơi vào tab `Chơi game` và bắt đầu nối cặp.
5. Khi một vòng được ghép đúng 100%, backend lưu vòng đó vào hồ sơ của người chơi.
6. Tab `Thông tin người đăng ký` hiển thị tổng số vòng mỗi người đã hoàn thành.
7. Khi refresh trang, dấu tick trên các vòng sẽ bị xóa khỏi giao diện, nhưng số vòng đã hoàn thành vẫn nằm trong `participants.json`.

## 5. API backend

### Lấy dữ liệu game

```http
GET /api/game
```

Backend trả về danh sách vòng chơi, thẻ vế A và thẻ vế B đã được xáo trộn.

### Đăng ký người chơi

```http
POST /api/register
Content-Type: application/json

{
  "fullName": "Nguyễn Văn A",
  "studentId": "SE12345",
  "classCode": "MLN131_01"
}
```

### Lấy danh sách người đăng ký

```http
GET /api/participants
```

### Kiểm tra đáp án

```http
POST /api/submit
Content-Type: application/json

{
  "participantId": "id-cua-nguoi-choi",
  "roundId": "round-can-kiem-liem-chinh",
  "answers": {
    "r2p1": "r2p1",
    "r2p2": "r2p2",
    "r2p3": "r2p3",
    "r2p4": "r2p4"
  }
}
```

Kết quả trả về:

```json
{
  "completed": true,
  "score": 4,
  "total": 4,
  "message": "Chính xác 100%. Bạn đã hoàn thành vòng chơi này.",
  "participant": {
    "fullName": "Nguyễn Văn A",
    "studentId": "SE12345",
    "classCode": "MLN131_01",
    "completedRoundCount": 1
  }
}
```

## 6. Chỉnh nội dung game

Mở file:

```text
data/game-data.json
```

Mỗi vòng có dạng:

```json
{
  "id": "round-id",
  "order": 1,
  "category": "Tên vòng",
  "instruction": "Hướng dẫn nối cặp",
  "source": "Nguồn nội dung",
  "pairs": [
    {
      "id": "r1p1",
      "left": "Vế A",
      "right": "Vế B đúng",
      "explain": "Giải thích ngắn"
    }
  ]
}
```

Lưu ý: `id` của từng pair phải là duy nhất trong vòng.

## 7. Deploy lên Render

1. Đẩy toàn bộ thư mục này lên GitHub.
2. Vào Render → New → Web Service.
3. Chọn repository.
4. Cấu hình:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
5. Deploy.

Nếu dùng file `render.yaml`, Render có thể nhận cấu hình tự động.

Lưu ý: bản này dùng file JSON để lưu người đăng ký, phù hợp cho demo/sự kiện nhỏ. Nếu cần chạy sản phẩm lớn hoặc lưu dữ liệu lâu dài sau nhiều lần redeploy, nên chuyển `participants.json` sang database như PostgreSQL, Supabase hoặc Firebase.

## 8. Deploy bằng Docker

```bash
docker build -t can-kiem-liem-chinh-game .
docker run -p 3000:3000 can-kiem-liem-chinh-game
```

Mở:

```text
http://localhost:3000
```

## 9. Ghi chú

- Game hiện có 10 vòng, mỗi vòng 4 cặp.
- Nội dung được biên soạn từ các file `Session 24.pptx`, `Session 25.pptx`, `Session 26.pptx`, `Session 27.pptx`, `Session 28.pptx` trong file ZIP đã cung cấp.
- Key visual nằm ở `public/assets/key-visual.png`, có thể thay bằng ảnh khác nhưng nên giữ cùng tên file để không cần sửa code.


### Quản lý người đăng ký

Trong tab **Thông tin người đăng ký**, có thể bấm **↻ Refresh dữ liệu** để tải lại danh sách mới nhất từ backend. Mỗi dòng có nút **×** để xóa thông tin người đăng ký khỏi `data/participants.json`. Nếu xóa đúng người chơi đang đăng nhập trên trình duyệt hiện tại, phiên chơi sẽ được đưa về trạng thái chưa có người chơi.

