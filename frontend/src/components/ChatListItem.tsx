import type { Chat, User } from "../types";
import Avatar from "./Avatar";

type ChatListItemProps = {
  chat: Chat;
  currentUserId: string;
  active: boolean;
  isOnline: boolean;
  isTyping: boolean;
  onClick: () => void;
};

const ChatListItem = ({
  chat,
  currentUserId,
  active,
  isOnline,
  isTyping,
  onClick,
}: ChatListItemProps) => {
  const peer = chat.participants.find((p) => p._id !== currentUserId) as User | undefined;
  if (!peer) return null;
  const isMyLastMessage = chat.lastMessage?.sender?._id === currentUserId;
  const mediaLabel = chat.lastMessage?.media ? `[${chat.lastMessage.media.kind}]` : "";
  const deletedLabel = chat.lastMessage?.deletedForEveryone ? "This message was deleted" : "";
  const lastMessageText = deletedLabel || chat.lastMessage?.text || mediaLabel || peer.email;
  const lastMessagePreview = isTyping ? "typing..." : lastMessageText;

  return (
    <button className={`chat-item ${active ? "active" : ""}`} onClick={onClick}>
      <Avatar name={peer.name} avatarUrl={peer.avatarUrl} small />
      <div className="chat-main">
        <div className="chat-top">
          <strong>{peer.name}</strong>
          <small>
            {chat.lastMessageAt
              ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""}
          </small>
        </div>
        <div className="chat-bottom">
          <small>
            {isMyLastMessage && !isTyping ? "You: " : ""}
            {lastMessagePreview}
          </small>
          <div className="chat-meta">
            {isOnline ? <span className="online-dot" /> : null}
            {(chat.unreadCount || 0) > 0 ? <span className="badge">{chat.unreadCount}</span> : null}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ChatListItem;
