# Fotobooth.vn Admin

Admin dashboard cho Fotobooth.vn, xây dựng bằng React, TypeScript, Tailwind CSS và TanStack Query.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở `http://localhost:5173/admin`. Ứng dụng sẽ chuyển tới `/login`. Có hai phương thức xác thực: Admin API key hoặc email/mật khẩu. Credential chỉ được giữ trong phiên trình duyệt và sẽ bị xoá khi đăng xuất/đóng tab.

Đăng nhập email/mật khẩu gọi `POST /api/auth/login`, nhận JWT (`accessToken`, `token`, hoặc `jwt`), sau đó gọi `GET /api/auth/me`. API admin dùng `Authorization: Bearer <JWT>`; nếu đăng nhập bằng API key, app gửi `x-api-key`.

## API

Không đưa API key, mật khẩu hoặc JWT secret vào biến môi trường frontend. Lớp API dùng chung nằm ở `src/lib/api.ts`.
