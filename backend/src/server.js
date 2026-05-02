const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authMiddleware = require("./middleware/auth");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const avatarsDir = path.join(uploadsDir, "avatars");
const mediaDir = path.join(uploadsDir, "media");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});
const mediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});
const upload = multer({ storage: avatarStorage });
const MAX_MEDIA_SIZE = 15 * 1024 * 1024;
const allowedMediaPrefixes = ["image/", "video/", "audio/"];
const allowedDocumentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
]);
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: MAX_MEDIA_SIZE },
  fileFilter: (_req, file, cb) => {
    const isAllowedPrefix = allowedMediaPrefixes.some((prefix) => file.mimetype.startsWith(prefix));
    const isAllowedDoc = allowedDocumentTypes.has(file.mimetype);
    if (isAllowedPrefix || isAllowedDoc) return cb(null, true);
    return cb(new Error("unsupported file type"));
  },
});

const detectMediaKind = (mimeType) => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads/avatars", express.static(avatarsDir));

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
const onlineUsers = new Set();
const socketToUser = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.data.userId = String(payload.userId);
    return next();
  } catch (_e) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  socketToUser.set(socket.id, userId);
  onlineUsers.add(userId);
  io.emit("online-users", Array.from(onlineUsers));

  socket.join(`user:${userId}`);

  socket.on("join-chat", (chatId) => {
    if (chatId) socket.join(`chat:${chatId}`);
  });

  socket.on("typing", ({ chatId }) => {
    if (chatId) socket.to(`chat:${chatId}`).emit("typing", { chatId, userId });
  });

  socket.on("stop-typing", ({ chatId }) => {
    if (chatId) socket.to(`chat:${chatId}`).emit("stop-typing", { chatId, userId });
  });

  socket.on("disconnect", async () => {
    const uid = socketToUser.get(socket.id);
    socketToUser.delete(socket.id);
    if (!uid) return;
    const stillOnline = Array.from(socketToUser.values()).some((id) => id === uid);
    if (!stillOnline) {
      onlineUsers.delete(uid);
      await User.findByIdAndUpdate(uid, { lastSeen: new Date() });
    }
    io.emit("online-users", Array.from(onlineUsers));
  });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.status(200).json(req.user);
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "name, email and password are required",
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      password,
    });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
      user: await User.findById(user._id).select("-password"),
    });
  } catch (error) {
    console.error("Registration Error:", error);

    return res.status(500).json({
      error: error.message || "Registration failed",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: String(email || "").toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const valid = await user.comparePassword(password || "");

    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      token,
      user: await User.findById(user._id).select("-password"),
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

app.post("/api/users/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Avatar file required" });
  const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, { avatarUrl }, { new: true }).select("-password");
  return res.status(200).json(user);
});

app.get("/api/users/search", authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(200).json([]);

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const terms = escaped.split(/\s+/).filter(Boolean);

    const queryBySingleTerm = {
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ],
    };

    const queryByAllTerms =
      terms.length > 1
        ? {
            _id: { $ne: req.user._id },
            $and: terms.map((term) => ({
              $or: [
                { name: { $regex: term, $options: "i" } },
                { email: { $regex: term, $options: "i" } },
                { phone: { $regex: term, $options: "i" } },
              ],
            })),
          }
        : queryBySingleTerm;

    const users = await User.find(queryByAllTerms)
      .sort({ name: 1, createdAt: -1 })
      .limit(30)
      .select("-password");

    return res.status(200).json(users);
  } catch (error) {
    console.error("User search error:", error);
    return res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/contacts", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).populate("contacts", "name email phone avatarUrl lastSeen");
  return res.status(200).json(user.contacts || []);
});

app.post("/api/contacts/:contactId", authMiddleware, async (req, res) => {
  const { contactId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(contactId)) return res.status(400).json({ error: "invalid contact id" });
  if (String(contactId) === String(req.user._id)) return res.status(400).json({ error: "cannot add self" });
  const contact = await User.findById(contactId).select("-password");
  if (!contact) return res.status(404).json({ error: "contact not found" });
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { contacts: contactId } });
  return res.status(201).json(contact);
});

app.delete("/api/contacts/:contactId", authMiddleware, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { contacts: req.params.contactId } });
  return res.status(200).json({ ok: true });
});

app.post("/api/chats/direct/:contactId", authMiddleware, async (req, res) => {
  const { contactId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(contactId)) return res.status(400).json({ error: "invalid contact id" });
  const me = String(req.user._id);
  let chat = await Chat.findOne({ participants: { $all: [me, contactId], $size: 2 } });
  if (!chat) {
    chat = await Chat.create({ participants: [me, contactId] });
  }
  const populated = await Chat.findById(chat._id)
    .populate("participants", "name email phone avatarUrl lastSeen")
    .populate({ path: "lastMessage", populate: { path: "sender", select: "name" } });
  return res.status(200).json(populated);
});

app.get("/api/chats", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate("participants", "name email phone avatarUrl lastSeen")
    .populate({ path: "lastMessage", populate: { path: "sender", select: "name" } });

  const visibleLastMessages = await Promise.all(
    chats.map(async (chat) => {
      const lastVisibleMessage = await Message.findOne({
        chat: chat._id,
        hiddenFor: { $ne: req.user._id },
      })
        .sort({ createdAt: -1 })
        .populate("sender", "name avatarUrl");
      return [String(chat._id), lastVisibleMessage];
    })
  );
  const visibleLastMessageMap = new Map(visibleLastMessages);

  const unreadCounts = await Message.aggregate([
    {
      $match: {
        chat: { $in: chats.map((chat) => chat._id) },
        sender: { $ne: new mongoose.Types.ObjectId(req.user._id) },
        readAt: null,
        deletedForEveryone: false,
        hiddenFor: { $ne: new mongoose.Types.ObjectId(req.user._id) },
      },
    },
    { $group: { _id: "$chat", count: { $sum: 1 } } },
  ]);
  const unreadMap = new Map(unreadCounts.map((item) => [String(item._id), item.count]));

  return res.status(200).json(
    chats.map((chat) => ({
      ...chat.toObject(),
      lastMessage: visibleLastMessageMap.get(String(chat._id)) || null,
      lastMessageAt: visibleLastMessageMap.get(String(chat._id))?.createdAt || chat.lastMessageAt,
      unreadCount: unreadMap.get(String(chat._id)) || 0,
    }))
  );
});

app.delete("/api/chats/:chatId", authMiddleware, async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
  if (!chat) return res.status(404).json({ error: "chat not found" });
  await Message.deleteMany({ chat: chat._id });
  await Chat.deleteOne({ _id: chat._id });
  return res.status(200).json({ ok: true });
});

app.get("/api/messages/:chatId", authMiddleware, async (req, res) => {
  const { chatId } = req.params;
  const search = String(req.query.search || "");
  const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
  if (!chat) return res.status(404).json({ error: "chat not found" });
  const query = { chat: chatId, hiddenFor: { $ne: req.user._id } };
  if (search.trim()) query.text = { $regex: search.trim(), $options: "i" };
  const messages = await Message.find(query).sort({ createdAt: 1 }).populate("sender", "name avatarUrl");
  return res.status(200).json(messages);
});

app.post("/api/messages", authMiddleware, async (req, res) => {
  const { chatId, text } = req.body;
  if ((!text || !text.trim()) && !req.file) {
  return res.status(400).json({ error: "message text or media required" });
}
  const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
  if (!chat) return res.status(404).json({ error: "chat not found" });
  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    text: text.trim(),
    deliveredAt: new Date(),
  });
  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();
  const populated = await message.populate("sender", "name avatarUrl");
  io.to(`chat:${chatId}`).emit("new-message", { chatId, message: populated });
  io.to(`user:${req.user._id}`).emit("chat-updated", { chatId });
  chat.participants
    .filter((p) => String(p) !== String(req.user._id))
    .forEach((uid) => io.to(`user:${uid}`).emit("chat-updated", { chatId }));
  return res.status(201).json(populated);
});

app.post("/api/messages/media", authMiddleware, mediaUpload.single("file"), async (req, res) => {
  const { chatId, text } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: "media file is required" });
  const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
  if (!chat) return res.status(404).json({ error: "chat not found" });
  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    text: String(text || "").trim(),
    deliveredAt: new Date(),
    media: {
      url: `${req.protocol}://${req.get("host")}/api/media/${file.filename}`,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind: detectMediaKind(file.mimetype),
    },
  });
  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();
  const populated = await message.populate("sender", "name avatarUrl");
  io.to(`chat:${chatId}`).emit("new-message", { chatId, message: populated });
  io.to(`user:${req.user._id}`).emit("chat-updated", { chatId });
  chat.participants
    .filter((p) => String(p) !== String(req.user._id))
    .forEach((uid) => io.to(`user:${uid}`).emit("chat-updated", { chatId }));
  return res.status(201).json(populated);
});

app.get("/api/media/:fileName", authMiddleware, async (req, res) => {
  const { fileName } = req.params;
  const message = await Message.findOne({ "media.fileName": fileName });
  if (!message) return res.status(404).json({ error: "media not found" });
  const chat = await Chat.findOne({ _id: message.chat, participants: req.user._id });
  if (!chat) return res.status(403).json({ error: "forbidden" });
  return res.sendFile(path.join(mediaDir, fileName));
});

app.patch("/api/messages/:messageId/delete", authMiddleware, async (req, res) => {
  const { messageId } = req.params;
  const { mode } = req.body;
  if (!["me", "everyone"].includes(mode)) return res.status(400).json({ error: "invalid deletion mode" });
  const message = await Message.findById(messageId).populate("sender", "name avatarUrl");
  if (!message) return res.status(404).json({ error: "message not found" });
  const chat = await Chat.findOne({ _id: message.chat, participants: req.user._id });
  if (!chat) return res.status(403).json({ error: "forbidden" });

  if (mode === "everyone") {
    if (String(message.sender._id) !== String(req.user._id)) {
      return res.status(403).json({ error: "only sender can delete for everyone" });
    }
    message.deletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
    message.deletedForEveryoneBy = req.user._id;
    message.text = "";
    if (message.media?.fileName) {
      const mediaPath = path.join(mediaDir, message.media.fileName);
      if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
      message.media = undefined;
    }
  } else {
    message.hiddenFor = Array.from(new Set([...(message.hiddenFor || []).map(String), String(req.user._id)])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
  }

  await message.save();
  const updated = await Message.findById(message._id).populate("sender", "name avatarUrl");
  io.to(`chat:${chat._id}`).emit("message-updated", { chatId: String(chat._id), message: updated });
  chat.participants.forEach((uid) => io.to(`user:${uid}`).emit("chat-updated", { chatId: String(chat._id) }));
  return res.status(200).json(updated);
});

app.patch("/api/messages/read/:chatId", authMiddleware, async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
  if (!chat) return res.status(404).json({ error: "chat not found" });
  await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user._id }, readAt: null },
    { $set: { readAt: new Date() } }
  );
  io.to(`chat:${chatId}`).emit("messages-read", { chatId, readerId: String(req.user._id) });
  return res.status(200).json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "file exceeds 15MB limit" });
    return res.status(400).json({ error: err.message });
  }
  if (String(err.message || "").includes("unsupported file type")) {
    return res.status(400).json({ error: "unsupported file type" });
  }
  res.status(500).json({ error: "internal server error" });
});

const bootstrap = async () => {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL is not configured");
  await mongoose.connect(process.env.MONGO_URL);
  server.listen(PORT, () => console.log(`Backend running on ${PORT}`));
};

bootstrap().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
