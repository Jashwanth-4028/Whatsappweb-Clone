# WhatsApp Web Clone

Production-style full-stack real-time messaging application inspired by WhatsApp Web, built to demonstrate strong full-stack engineering, authentication architecture, real-time communication, and modern UI/UX design.

---

## Demo Video

https://drive.google.com/file/d/1boqzOmyOSNbmb6vFub-ximjP1rolYkri/view?usp=sharing

---

## Screenshots

### Login Page

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/91bc1c96-c57f-4f78-9e6a-a4cc442e9497" />


### Registration Page

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/90877a12-0df7-4413-9f40-0f53a3afd9c2" />


### Main Chat Interface

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/b510ae2e-768b-4553-b50f-7afdc05bb02b" />


### New Chat / Contact Search

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/fa63023d-c0c3-45e3-9c40-d0ba7a3fe3f9" />


### Media Sharing / Message Deletion

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/ee33f898-b364-4382-a9f6-27874e9661a6" />
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/3193e15f-d352-4128-a32f-f514540912c0" />



---

## Key Features

### Authentication & User Management

* Secure user registration and login
* JWT-based authentication
* Persistent login sessions
* Protected frontend routes
* Logout functionality
* Profile image upload

### Contacts & Chats

* Search users by:

  * Name
  * Email
  * Phone
* Add/remove contacts
* Start direct chats
* Sidebar with:

  * Profile images
  * Last message preview
  * Timestamps
  * Unread badges
  * Active chat highlighting

### Real-Time Messaging

* Instant real-time messaging using Socket.IO
* Typing indicators
* Online/offline presence
* Last seen
* Read receipts
* Browser notifications
* Persistent chat history

### Advanced Messaging Features

* Text messaging
* Media sharing:

  * Images
  * Videos
  * Audio
  * Documents
* Upload progress indicators
* Message deletion:

  * Delete for Me
  * Delete for Everyone
* Deleted message placeholders

### UI/UX Enhancements

* WhatsApp-inspired interface
* Dark/light mode
* Mobile responsive design
* Professional sidebar
* Realistic iconography
* Improved typography
* Contact search modal
* Modern message bubbles
* Error handling & loading states

---

## Tech Stack

### Frontend

* React
* TypeScript
* React Router
* Axios
* Socket.IO Client
* Context API
* Lucide React Icons

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt
* Socket.IO
* multer

---

## Project Structure

```bash
backend/
 ┣ src/
 ┃ ┣ models/
 ┃ ┃ ┣ User.js
 ┃ ┃ ┣ Chat.js
 ┃ ┃ ┗ Message.js
 ┃ ┣ middleware/
 ┃ ┃ ┗ auth.js
 ┃ ┗ server.js

frontend/
 ┣ src/
 ┃ ┣ components/
 ┃ ┣ context/
 ┃ ┣ pages/
 ┃ ┣ api.ts
 ┃ ┗ types.ts
```

---

## Installation & Setup

### Backend Setup

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

### Required backend/.env

```env
PORT=4000
MONGO_URL=mongodb://127.0.0.1:27017/whatsapp_clone
FRONTEND_URL=http://localhost:5173
```

---

### Frontend Setup

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

### Required frontend/.env

```env
VITE_API_URL=http://localhost:4000
```

---

## API Overview

### Authentication

* POST /api/auth/register
* POST /api/auth/login
* GET /api/auth/me

### User

* POST /api/users/avatar
* GET /api/users/search?q=...

### Contacts

* GET /api/contacts
* POST /api/contacts/:contactId
* DELETE /api/contacts/:contactId

### Chats

* GET /api/chats
* POST /api/chats/direct/:contactId
* DELETE /api/chats/:chatId

### Messages

* GET /api/messages/:chatId
* POST /api/messages
* POST /api/messages/media
* PATCH /api/messages/read/:chatId
* PATCH /api/messages/:messageId/delete

---

## Security Notes

* JWT authentication via:
  Authorization: Bearer <token>

* Socket.IO authentication via JWT

* Password hashing using bcrypt

* Protected API routes

* Secure media validation

* File size/type restrictions

---

## Future Enhancements

* Group chats
* Voice/video calls
* Emoji reactions
* Message forwarding
* Cloud media storage
* Deployment (Vercel/Render)
* Push notifications

---

## Recruitment Value

This project demonstrates:

* Full-stack web development
* Authentication systems
* Real-time communication
* REST API development
* MongoDB schema design
* Responsive UI/UX
* Product-level feature implementation
* Debugging & optimization
* Professional project architecture

---

## Author

JASHWANTH G P

---

## Submission Links

### GitHub Repository:

 https://github.com/Jashwanth-4028/Whatsappweb-Clone.git

### Demo Video:

https://drive.google.com/file/d/1boqzOmyOSNbmb6vFub-ximjP1rolYkri/view?usp=sharing
