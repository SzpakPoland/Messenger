export interface User {
  _id: string;
  username: string;
  avatar: string | null;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface MessageReadBy {
  user: string;
  readAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  readBy: MessageReadBy[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  type: 'private' | 'group';
  name?: string;
  avatar?: string | null;
  description?: string;
  participants: User[];
  admins?: User[];
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

export interface AuthUser extends User {}
