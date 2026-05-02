import type { Message } from "../types";
import { MoreVertical, Download } from "lucide-react";

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  onDeleteForMe: (message: Message) => void;
  onDeleteForEveryone: (message: Message) => void;
};

const MessageBubble = ({ message, isMine, onDeleteForMe, onDeleteForEveryone }: MessageBubbleProps) => {
  const status = message.readAt ? "read" : message.deliveredAt ? "delivered" : "sent";
  const ticks = status === "sent" ? "✓" : "✓✓";
  const isDeletedForEveryone = Boolean(message.deletedForEveryone);
  const hasMedia = Boolean(message.media?.url) && !isDeletedForEveryone;
  const token = localStorage.getItem("token");
  const mediaUrl =
    message.media?.url && token && message.media.url.includes("/api/media/")
      ? `${message.media.url}${message.media.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      : message.media?.url || "";

  const renderMedia = () => {
    if (!message.media?.url) return null;
    if (message.media.kind === "image") {
      return (
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="media-link">
          <img src={mediaUrl} alt={message.media.originalName} className="msg-media-image" />
        </a>
      );
    }
    if (message.media.kind === "video") {
      return <video controls className="msg-media-video" src={mediaUrl} />;
    }
    if (message.media.kind === "audio") {
      return <audio controls className="msg-media-audio" src={mediaUrl} />;
    }
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="msg-doc">
        <Download size={15} />
        <span>{message.media.originalName}</span>
      </a>
    );
  };

  return (
    <div className={`msg-row ${isMine ? "mine" : "their"}`}>
      <div className={`msg-bubble ${isMine ? "mine" : "their"}`}>
        <div className="msg-actions">
          <button className="msg-menu-btn" aria-label="Message options">
            <MoreVertical size={15} />
          </button>
          <div className="msg-menu-popover">
            <button onClick={() => onDeleteForMe(message)}>Delete for me</button>
            {isMine && !isDeletedForEveryone ? <button onClick={() => onDeleteForEveryone(message)}>Delete for everyone</button> : null}
          </div>
        </div>
        {isDeletedForEveryone ? <p className="msg-deleted">This message was deleted</p> : null}
        {hasMedia ? renderMedia() : null}
        {!isDeletedForEveryone && message.text ? <p>{message.text}</p> : null}
        <div className="msg-meta">
          <small>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>
          {isMine && !isDeletedForEveryone ? <small className={`msg-status ${status}`}>{ticks}</small> : null}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
