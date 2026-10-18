export interface AeroUser {
  _id?: string;
  id?: string;
  username?: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  profilePic?: string | null;
  joinedAt?: string;
  plan?: string;
}

export interface AeroProfile {
  apiUrl: string;
  accessToken?: string;
  refreshToken?: string;
  csrf?: string;
  tokenExpiresAt?: number;
  user?: AeroUser;
  dobCompleted?: boolean;
}

export interface AeroPreferences {
  output?: 'pretty' | 'json';
  quiet?: boolean;
  timezone?: string;
}

export interface AeroConfig {
  activeProfile: string;
  profiles: Record<string, AeroProfile>;
  preferences: AeroPreferences;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  animated?: boolean;
  isSuper?: boolean;
  createdAt?: string;
  _id?: string;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId?: string;
  dockId?: string;
  channelId?: string;
  text: string;
  status?: string;
  isRead?: boolean;
  editedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reactions?: MessageReaction[];
  attachment?: {
    fileName?: string;
    type?: string;
    url?: string;
    fileSize?: number;
    mimeType?: string;
  };
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  deletedForEveryone?: boolean;
}

export interface DockChannel {
  _id: string;
  name: string;
  type?: string;
  category?: string;
  unreadCount?: number;
}

export interface Dock {
  _id: string;
  name: string;
  description?: string;
  icon?: string | null;
  banner?: string | null;
  unreadCount?: number;
  role?: string;
  memberCount?: number;
  channels?: DockChannel[];
}

export interface MediaUrlResponse {
  url: string;
  expiresIn?: number;
  blurhash?: string;
  kind?: string;
  variants?: {
    thumb?: { url?: string; key?: string; width?: number; height?: number };
    sd?: { url?: string; key?: string; width?: number; height?: number };
    hd?: { url?: string; key?: string; width?: number; height?: number };
  };
}

export interface SendMessageOptions {
  replyToMessageId?: string;
  channelId?: string;
  filePath?: string;
}

export interface ListMessagesOptions {
  limit?: number;
  before?: string;
  channelId?: string;
}

export interface Friend {
  _id: string;
  username: string;
  fullName?: string;
  profilePic?: string | null;
  bio?: string;
  lastSeen?: string;
  status?: string;
}

export interface FriendRequest {
  _id: string;
  requester: string | Friend;
  recipient: string | Friend;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequestsResult {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}
