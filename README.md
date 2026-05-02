# Mini WhatsApp Web (Recruitment-Level)

Production-style full-stack messaging app inspired by WhatsApp Web.

## Highlights

- Secure authentication (`register`, `login`, JWT, protected routes, persistent session)
- Contacts-based workflow (search users by email/phone/name, add/remove contacts, new chat flow)
- Real-time messaging with Socket.IO
- Typing indicators, online presence, last seen, read receipts
- Conversation list with profile image, last message preview, timestamps, unread badges
- Chat search, delete chat, delete contact
- Profile image upload
- Mobile responsive layout
- Dark/light theme toggle
- Browser notifications for incoming messages

## Stack

- Frontend: React + TypeScript + React Router + Axios + Socket.IO Client + Context API
- Backend: Node.js + Express + MongoDB (Mongoose) + JWT + bcrypt + Socket.IO + multer

## Project Structure

- `backend/src/models`: `User`, `Chat`, `Message`
- `backend/src/middleware`: auth middleware
- `backend/src/server.js`: API + socket server
- `frontend/src/context`: auth state
- `frontend/src/pages`: login, register, chat UI
- `frontend/src/components`: route protection

## Setup

### 1) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Required env values in `backend/.env`:

- `PORT=4000`
- `MONGO_URL=mongodb://127.0.0.1:27017/whatsapp_clone`
- `FRONTEND_URL=http://localhost:5173`
- `JWT_SECRET=<strong_secret>`

### 2) Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Default frontend env:

- `VITE_API_URL=http://localhost:4000`

## API Overview

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Profile: `POST /api/users/avatar`
- Contacts: `GET /api/contacts`, `POST /api/contacts/:contactId`, `DELETE /api/contacts/:contactId`
- User search: `GET /api/users/search?q=...`
- Chats: `GET /api/chats`, `POST /api/chats/direct/:contactId`, `DELETE /api/chats/:chatId`
- Messages: `GET /api/messages/:chatId`, `POST /api/messages`, `PATCH /api/messages/read/:chatId`

## Notes

- JWT is sent via `Authorization: Bearer <token>`
- Socket auth uses the same JWT token
- Uploaded profile images are served from `/uploads`
