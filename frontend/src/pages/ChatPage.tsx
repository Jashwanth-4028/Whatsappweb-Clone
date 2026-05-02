import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { io, Socket } from "socket.io-client";
import {
  Camera,
  LogOut,
  Menu,
  Moon,
  Phone,
  Search,
  Sun,
  Trash2,
  UserRoundX,
  Video,
  MessageCircle,
  Paperclip,
  X,
} from "lucide-react";
import { api, API_URL } from "../api";
import { useAuth } from "../context/AuthContext";
import type { Chat, Message, User } from "../types";
import Avatar from "../components/Avatar";
import ChatListItem from "../components/ChatListItem";
import MessageBubble from "../components/MessageBubble";
import NewChatModal from "../components/NewChatModal";

const ChatPage = () => {
  const { user, logout, setUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchContacts, setSearchContacts] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    message: Message | null;
    mode: "me" | "everyone";
  }>({ open: false, message: null, mode: "me" });
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const activeChatIdRef = useRef("");

  const activeChat = chats.find((c) => c._id === activeChatId);
  const activePeer = useMemo(() => {
    if (!activeChat || !user) return null;
    return activeChat.participants.find((p) => p._id !== user._id) || null;
  }, [activeChat, user]);

  const visibleChats = useMemo(() => {
    if (!user) return [];
    return chats.filter((chat) => {
      const peer = chat.participants.find((p) => p._id !== user._id);
      if (!peer) return false;
      const value = `${peer.name} ${peer.email} ${chat.lastMessage?.text || ""}`.toLowerCase();
      return value.includes(searchContacts.toLowerCase().trim());
    });
  }, [chats, searchContacts, user]);

  const updateChatPreview = (chatId: string, message: Message, fromCurrentUser: boolean) => {
    setChats((prev) =>
      prev
        .map((chat) => {
          if (chat._id !== chatId) return chat;
          return {
            ...chat,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: fromCurrentUser ? 0 : activeChatIdRef.current === chatId ? 0 : (chat.unreadCount || 0) + 1,
          };
        })
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    );
  };

  const upsertMessage = (message: Message) => {
    setMessages((prev) => {
      if (
        prev.some(
          (m) =>
            m._id === message._id ||
            (m.text === message.text &&
              m.sender._id === message.sender._id &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
        )
      ) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const isSupportedFile = (file: File) => {
    const validDocTypes = new Set([
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
    return (
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/") ||
      validDocTypes.has(file.type)
    );
  };

  const loadChats = async () => {
    setLoadingChats(true);
    const chatsRes = await api.get<Chat[]>("/chats");
    setChats(chatsRes.data);
    setLoadingChats(false);
    if (!activeChatId && chatsRes.data.length) setActiveChatId(chatsRes.data[0]._id);
  };

  const loadMessages = async (chatId: string) => {
    if (!chatId) return;
    setLoadingMessages(true);
    const res = await api.get<Message[]>(`/messages/${chatId}`, { params: { search: chatSearch } });
    setMessages(res.data);
    await api.patch(`/messages/read/${chatId}`);
    setLoadingMessages(false);
  };

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
    loadChats().catch(() => setError("Failed to load chats"));
  }, [user]);

  useEffect(() => {
    if (!activeChatId) return;
    loadMessages(activeChatId).catch(() => setError("Failed to load messages"));
    socketRef.current?.emit("join-chat", activeChatId);
    if (window.innerWidth <= 980) setIsSidebarOpen(false);
  }, [activeChatId, chatSearch]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on("online-users", (users: string[]) => setOnlineUsers(users));
    socket.on("typing", ({ chatId, userId }: { chatId: string; userId: string }) => {
      setTypingMap((prev) => ({ ...prev, [chatId]: userId }));
    });
    socket.on("stop-typing", ({ chatId }: { chatId: string }) => {
      setTypingMap((prev) => ({ ...prev, [chatId]: "" }));
    });
    socket.on("connect", () => {
      if (activeChatIdRef.current) socket.emit("join-chat", activeChatIdRef.current);
    });
    socket.on("new-message", ({ chatId, message }: { chatId: string; message: Message }) => {
      const isMine = message.sender._id === user._id;
      if (chatId === activeChatIdRef.current) {
        upsertMessage(message);
      } else if (!isMine && "Notification" in window && Notification.permission === "granted") {
        new Notification(message.sender.name, { body: message.text });
      }
      updateChatPreview(chatId, message, isMine);
    });
    socket.on("chat-updated", () => loadChats().catch(() => undefined));
    socket.on("message-updated", ({ chatId, message }: { chatId: string; message: Message }) => {
      if (chatId !== activeChatIdRef.current) return;
      setMessages((prev) => prev.map((item) => (item._id === message._id ? message : item)));
    });
    socket.on("messages-read", ({ chatId, readerId }: { chatId: string; readerId: string }) => {
      if (!user || readerId === user._id || chatId !== activeChatIdRef.current) return;
      setMessages((prev) =>
        prev.map((msg) => (msg.sender._id === user._id && !msg.readAt ? { ...msg, readAt: new Date().toISOString() } : msg))
      );
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  const onStartDirectChat = async (contact: User) => {
    await api.post(`/contacts/${contact._id}`);
    const chatRes = await api.post<Chat>(`/chats/direct/${contact._id}`);
    setShowNewChatModal(false);
    await loadChats();
    setActiveChatId(chatRes.data._id);
  };

  const onAddContactOnly = async (contact: User) => {
    await api.post(`/contacts/${contact._id}`);
    await api.post(`/chats/direct/${contact._id}`);
    await loadChats();
  };

  const onDeleteContact = async (contactId: string) => {
    await api.delete(`/contacts/${contactId}`);
    await loadChats();
  };

  const onDeleteChat = async (chatId: string) => {
    await api.delete(`/chats/${chatId}`);
    if (chatId === activeChatId) {
      setActiveChatId("");
      setMessages([]);
    }
    await loadChats();
  };

  const onSendMessage = async () => {
    if (!activeChatId || (!newMessage.trim() && !selectedFile)) return;
    const text = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      chat: activeChatId,
      sender: user as User,
      text,
      media: selectedFile
        ? {
            url: URL.createObjectURL(selectedFile),
            fileName: selectedFile.name,
            originalName: selectedFile.name,
            mimeType: selectedFile.type,
            size: selectedFile.size,
            kind: selectedFile.type.startsWith("image/")
              ? "image"
              : selectedFile.type.startsWith("video/")
                ? "video"
                : selectedFile.type.startsWith("audio/")
                  ? "audio"
                  : "document",
          }
        : undefined,
      createdAt: new Date().toISOString(),
      readAt: null,
      deliveredAt: null,
    };
    upsertMessage(optimisticMessage);
    updateChatPreview(activeChatId, optimisticMessage, true);
    setNewMessage("");
    setSelectedFile(null);
    setSending(true);
    setUploadProgress(0);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("chatId", activeChatId);
        formData.append("text", text);
        formData.append("file", selectedFile);
        res = await api.post<Message>("/messages/media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            const total = evt.total || 0;
            if (total) setUploadProgress(Math.round((evt.loaded / total) * 100));
          },
        });
      } else {
        res = await api.post<Message>("/messages", { chatId: activeChatId, text });
      }
      setMessages((prev) => prev.map((msg) => (msg._id === tempId ? res.data : msg)));
      updateChatPreview(activeChatId, res.data, true);
      socketRef.current?.emit("stop-typing", { chatId: activeChatId });
      setError("");
    } catch (_e) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setError("Failed to send message");
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const onDeleteMessage = async (mode: "me" | "everyone") => {
    if (!deleteModal.message) return;
    try {
      const res = await api.patch<Message>(`/messages/${deleteModal.message._id}/delete`, { mode });
      if (mode === "me") {
        setMessages((prev) => prev.filter((msg) => msg._id !== deleteModal.message?._id));
      } else {
        setMessages((prev) => prev.map((msg) => (msg._id === res.data._id ? res.data : msg)));
      }
      await loadChats();
      setDeleteModal({ open: false, message: null, mode: "me" });
    } catch (_e) {
      setError("Failed to delete message");
    }
  };

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB limit");
      return;
    }
    if (!isSupportedFile(file)) {
      setError("Unsupported file type");
      return;
    }
    setSelectedFile(file);
    setError("");
  };

  const onTypeMessage = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!activeChatId) return;
    socketRef.current?.emit("typing", { chatId: activeChatId });
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => {
      socketRef.current?.emit("stop-typing", { chatId: activeChatId });
    }, 900);
  };

  const onUploadAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append("avatar", e.target.files[0]);
    const res = await api.post<User>("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setUser(res.data);
  };

  const fmtSeen = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "Not available");

  return (
    <div className="wa-shell">
      <aside className={`wa-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="wa-logo">
          <span className="logo-mark">
            <MessageCircle size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>WhatsApp Web</strong>
            <small>Realtime messaging demo</small>
          </div>
        </div>
        <div className="wa-profile">
          <Avatar name={user?.name || "User"} avatarUrl={user?.avatarUrl} />
          <div className="profile-meta">
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
          <label className="avatar-upload icon-btn" title="Upload profile">
            <Camera size={17} />
            <input type="file" accept="image/*" onChange={onUploadAvatar} />
          </label>
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut size={17} />
          </button>
        </div>

        <div className="sidebar-tools">
          <div className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input
              value={searchContacts}
              onChange={(e) => setSearchContacts(e.target.value)}
              placeholder="Search chats, names, last message"
            />
          </div>
          <button onClick={() => setShowNewChatModal(true)}>+ New Chat</button>
        </div>

        <div className="chat-list">
          {loadingChats ? <div className="empty-list">Loading chats...</div> : null}
          {!loadingChats && !visibleChats.length ? <div className="empty-list">No chats yet. Start a new one.</div> : null}
          {visibleChats.map((chat) => {
            const peer = chat.participants.find((p) => p._id !== user?._id);
            if (!peer || !user) return null;
            return (
              <ChatListItem
                key={chat._id}
                chat={chat}
                currentUserId={user._id}
                active={activeChatId === chat._id}
                isOnline={onlineUsers.includes(peer._id)}
                isTyping={Boolean(typingMap[chat._id])}
                onClick={() => setActiveChatId(chat._id)}
              />
            );
          })}
        </div>
      </aside>

      <main className="wa-main">
        {activePeer ? (
          <>
            <header className="chat-header">
              <button className="icon-btn mobile-only" onClick={() => setIsSidebarOpen((prev) => !prev)} aria-label="Toggle chat list">
                <Menu size={18} />
              </button>
              <Avatar name={activePeer.name} avatarUrl={activePeer.avatarUrl} small />
              <div className="chat-peer-meta">
                <strong>{activePeer.name}</strong>
                <small>
                  {typingMap[activeChatId]
                    ? "typing..."
                    : onlineUsers.includes(activePeer._id)
                      ? "online"
                      : `last seen ${fmtSeen(activePeer.lastSeen)}`}
                </small>
              </div>
              <div className="header-icons">
                <div className="header-icons-main">
                  <button className="icon-btn" aria-label="Audio call">
                    <Phone size={17} />
                  </button>
                  <button className="icon-btn" aria-label="Video call">
                    <Video size={17} />
                  </button>
                </div>
                <div className="header-icons-danger">
                  <button className="icon-btn" aria-label="Delete chat" onClick={() => onDeleteChat(activeChatId).catch(() => setError("Delete chat failed"))}>
                    <Trash2 size={17} />
                  </button>
                  <button className="icon-btn" aria-label="Remove contact" onClick={() => onDeleteContact(activePeer._id).catch(() => setError("Delete contact failed"))}>
                    <UserRoundX size={17} />
                  </button>
                </div>
              </div>
            </header>

            <div className="chat-search">
              <div className="input-with-icon">
                <Search size={16} aria-hidden="true" />
                <input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search in conversation"
                  aria-label="Search messages"
                />
              </div>
            </div>
            <section className="message-wallpaper">
              {loadingMessages ? <div className="empty-list">Loading messages...</div> : null}
              {!loadingMessages && !messages.length ? <div className="empty-list">No messages yet. Say hello.</div> : null}
              {messages.map((m) => (
                <MessageBubble
                  key={m._id}
                  message={m}
                  isMine={m.sender._id === user?._id}
                  onDeleteForMe={(message) => setDeleteModal({ open: true, message, mode: "me" })}
                  onDeleteForEveryone={(message) => setDeleteModal({ open: true, message, mode: "everyone" })}
                />
              ))}
              <div ref={endRef} />
            </section>
            <footer className="composer">
              <label className="icon-btn composer-attach" aria-label="Attach file">
                <Paperclip size={17} />
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  onChange={onSelectFile}
                />
              </label>
              <input
                value={newMessage}
                onChange={onTypeMessage}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && onSendMessage().catch(() => setError("Send failed"))}
              />
              <button className="send-btn" disabled={sending} onClick={() => onSendMessage().catch(() => setError("Send failed"))}>
                {sending ? "..." : "Send"}
              </button>
            </footer>
            {selectedFile ? (
              <div className="media-preview-bar">
                <div>
                  <strong>{selectedFile.name}</strong>
                  <small>{Math.ceil(selectedFile.size / 1024)} KB</small>
                </div>
                <button className="icon-btn" onClick={() => setSelectedFile(null)} aria-label="Remove selected file">
                  <X size={16} />
                </button>
              </div>
            ) : null}
            {sending && uploadProgress > 0 ? (
              <div className="upload-progress">
                <span>Uploading media...</span>
                <div className="upload-progress-track">
                  <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-panel">
            <button className="icon-btn mobile-only" onClick={() => setIsSidebarOpen((prev) => !prev)} aria-label="Toggle chat list">
              <Menu size={18} />
            </button>
            Select or create a chat to start messaging.
          </div>
        )}
        {error ? <p className="error">{error}</p> : null}
      </main>

      <NewChatModal
        open={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onContactAdded={onAddContactOnly}
        onStartChat={onStartDirectChat}
      />
      {deleteModal.open && deleteModal.message ? (
        <div className="modal-backdrop" onClick={() => setDeleteModal({ open: false, message: null, mode: "me" })}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{deleteModal.mode === "everyone" ? "Delete for everyone?" : "Delete for me?"}</h3>
            <p className="modal-subtitle">
              {deleteModal.mode === "everyone"
                ? "This message will be replaced with a deleted placeholder for all participants."
                : "This message will be removed only from your view."}
            </p>
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setDeleteModal({ open: false, message: null, mode: "me" })}>
                Cancel
              </button>
              <button onClick={() => onDeleteMessage(deleteModal.mode)}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChatPage;
