# phat-work — Frontend

Giao diện tĩnh cho game **Cần Kiệm Liêm Chính Matching Game**.

## Cấu trúc

```
phat-work-fe/
├── index.html      # Giao diện chính (single-page)
├── app.js          # Logic frontend
├── styles.css      # Stylesheet
└── assets/
    └── key-visual.png
```

## Cách dùng

Frontend này cần chạy cùng với backend (`phat-work-be/`).  
Tất cả API calls trong `app.js` đều gọi đến `/api/*` — backend phải chạy cùng origin.

### Cách 1 — Backend serve luôn frontend (khuyến nghị)

Copy toàn bộ thư mục này thành `public/` bên trong `phat-work-be/`:

```bash
cp -r phat-work-fe phat-work-be/public
cd phat-work-be
node server.js
```

Mở `http://localhost:3000`.

### Cách 2 — Live reload với VS Code Live Server

Dùng Live Server extension, trỏ vào thư mục này.  
Backend phải chạy riêng tại `http://localhost:3000` và cần cấu hình proxy hoặc CORS.

## Ghi chú thiết kế

- Font: [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro)
- Key visual: `assets/key-visual.png` — ảnh chủ đạo "Sắc Màu Di Sản"
- Không dùng framework, không có build step — mở thẳng file HTML là chạy được
