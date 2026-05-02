export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  lastSeen?: string;
};

export type Message = {
  _id: string;
  chat: string;
  sender: User;
  text: string;
  media?: {
    url: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    kind: "image" | "video" | "audio" | "document";
  };
  createdAt: string;
  readAt: string | null;
  deliveredAt?: string | null;
  deletedForEveryone?: boolean;
  deletedForEveryoneAt?: string | null;
};

export type Chat = {
  _id: string;
  participants: User[];
  lastMessage?: Message | null;
  lastMessageAt: string;
  unreadCount?: number;
};
