import { Providers } from './providers';

export type User = {
  id: string;
  name: string;
  avatar: any;
  profession?: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO date string
  read: boolean;
  attachments?: Array<{
    type: 'image' | 'document' | 'location';
    url?: string;
    name?: string;
    coordinates?: { latitude: number; longitude: number };
  }>;
};

export type Chat = {
  id: string;
  participants: User[];
  unreadCount: number;
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  messages: Message[];
};


export const CurrentUser: User = {
  id: 'current-user',
  name: 'You',
  avatar: require('@/assets/images/avatar-placeholder.png')
};

// Generate contacts from providers
const contacts: User[] = Providers.map(provider => ({
  id: `${provider.id}`,
  name: provider.name,
  avatar: provider.avatar,
  profession: provider.profession
}));

// Can a chat happen between any two user?
contacts.push(
  {
    id: 'user-101',
    name: 'Sarah Johnson',
    avatar: require('@/assets/images/avatar-placeholder.png')
  },
  {
    id: 'user-102',
    name: 'Michael Chen',
    avatar: require('@/assets/images/avatar-placeholder.png')
  }
);

// Sample conversations
export const Chats: Chat[] = [
  {
    id: 'chat-1',
    participants: [CurrentUser, contacts[0]],
    unreadCount: 2,
    lastMessage: {
      text: "I'll bring my tools tomorrow at 9am as we discussed.",
      timestamp: "2025-07-01T18:30:00Z",
      senderId: contacts[0].id
    },
    messages: [
      {
        id: '1-1',
        senderId: CurrentUser.id,
        text: "Hi, I need someone to fix the wiring in my kitchen. Are you available this week?",
        timestamp: "2025-06-30T09:00:00Z",
        read: true
      },
      {
        id: '1-2',
        senderId: contacts[0].id,
        text: "Hello! Yes, I have availability on Wednesday or Thursday. What specific issues are you having?",
        timestamp: "2025-06-30T09:15:00Z",
        read: true
      },
      {
        id: '1-3',
        senderId: CurrentUser.id,
        text: "The outlets aren't working and the lights flicker when I use the microwave.",
        timestamp: "2025-06-30T09:20:00Z",
        read: true
      },
      {
        id: '1-4',
        senderId: contacts[0].id,
        text: "Sounds like you might have an overloaded circuit. I can come Thursday at 2pm to check it out.",
        timestamp: "2025-06-30T09:30:00Z",
        read: true
      },
      {
        id: '1-5',
        senderId: CurrentUser.id,
        text: "Thursday at 2pm works perfect. My address is 123 Main Street. How long do you think it will take?",
        timestamp: "2025-06-30T09:45:00Z",
        read: true
      },
      {
        id: '1-6',
        senderId: contacts[0].id,
        text: "It depends on the complexity, but typically 2-3 hours for this type of issue. I'll bring all necessary equipment.",
        timestamp: "2025-07-01T10:00:00Z",
        read: true
      },
      {
        id: '1-7',
        senderId: contacts[0].id,
        text: "I'll bring my tools tomorrow at 9am as we discussed.",
        timestamp: "2025-07-01T18:30:00Z",
        read: false
      }
    ]
  },
  {
    id: 'chat-2',
    participants: [CurrentUser, contacts[1]],
    unreadCount: 1,
    lastMessage: {
      text: "Your dress is ready for pickup anytime tomorrow between 10am-6pm.",
      timestamp: "2025-07-02T16:45:00Z",
      senderId: contacts[1].id
    },
    messages: [
      {
        id: '2-1',
        senderId: CurrentUser.id,
        text: "Hello, I need a dress altered for a wedding next month. Do you do rush orders?",
        timestamp: "2025-06-29T14:00:00Z",
        read: true
      },
      {
        id: '2-2',
        senderId: contacts[1].id,
        text: "Hi there! Yes, I can do rush alterations. When exactly is the wedding and what type of alterations are needed?",
        timestamp: "2025-06-29T14:10:00Z",
        read: true
      },
      {
        id: '2-3',
        senderId: CurrentUser.id,
        text: "The wedding is July 25th. I need the dress taken in at the waist and shortened about 2 inches.",
        timestamp: "2025-06-29T14:15:00Z",
        read: true
      },
      {
        id: '2-4',
        senderId: contacts[1].id,
        text: "I can definitely do that with plenty of time before the wedding. Would you like to schedule a fitting?",
        timestamp: "2025-06-29T14:25:00Z",
        read: true
      },
      {
        id: '2-5',
        senderId: CurrentUser.id,
        text: "That price works for me. Can I come in tomorrow for the fitting?",
        timestamp: "2025-06-29T14:30:00Z",
        read: true,
        attachments: [{
          type: 'image',
          url: 'dress.jpg',
          name: 'My dress'
        }]
      },
      {
        id: '2-6',
        senderId: contacts[1].id,
        text: "Your dress is ready for pickup anytime tomorrow between 10am-6pm.",
        timestamp: "2025-07-02T16:45:00Z",
        read: false
      }
    ]
  },
  {
    id: 'chat-3',
    participants: [CurrentUser, contacts[2]],
    unreadCount: 0,
    lastMessage: {
      text: "I've sent you the invoice for the design work. Please let me know if you have any questions!",
      timestamp: "2025-07-03T12:00:00Z",
      senderId: contacts[2].id
    },
    messages: [
      {
        id: '3-1',
        senderId: CurrentUser.id,
        text: "Hi, I need a logo designed for my new startup. Can you help?",
        timestamp: "2025-07-01T15:00:00Z",
        read: true
      },
      {
        id: '3-2',
        senderId: contacts[2].id,
        text: "Hello! I'd be happy to design a logo for your startup. Could you tell me more about your business?",
        timestamp: "2025-07-01T15:10:00Z",
        read: true
      },
      {
        id: '3-3',
        senderId: CurrentUser.id,
        text: "It's a mobile app for connecting local service providers with customers. We want something modern and clean.",
        timestamp: "2025-07-01T15:20:00Z",
        read: true
      },
      {
        id: '3-4',
        senderId: contacts[2].id,
        text: "That sounds like an exciting project! I can definitely create something that conveys trust and efficiency.",
        timestamp: "2025-07-01T15:30:00Z",
        read: true
      },
      {
        id: '3-5',
        senderId: CurrentUser.id,
        text: "Great! Here's our company brief and some examples of styles we like.",
        timestamp: "2025-07-02T10:15:00Z",
        read: true
      },
      {
        id: '3-6',
        senderId: contacts[2].id,
        text: "I've sent you the invoice for the design work. Please let me know if you have any questions!",
        timestamp: "2025-07-03T12:00:00Z",
        read: true
      }
    ]
  },
  {
    id: 'chat-4',
    participants: [CurrentUser, contacts[3]],
    unreadCount: 3,
    lastMessage: {
      text: "Don't forget to bring the slides for tomorrow's presentation!",
      timestamp: "2025-07-02T21:15:00Z",
      senderId: contacts[3].id
    },
    messages: [
      {
        id: '4-1',
        senderId: contacts[3].id,
        text: "Hey, are we still meeting for coffee tomorrow?",
        timestamp: "2025-07-02T18:30:00Z",
        read: false
      },
      {
        id: '4-2',
        senderId: CurrentUser.id,
        text: "Yes, 10am at the usual place?",
        timestamp: "2025-07-02T18:35:00Z",
        read: true
      },
      {
        id: '4-3',
        senderId: contacts[3].id,
        text: "Perfect! See you then.",
        timestamp: "2025-07-02T18:40:00Z",
        read: false
      },
      {
        id: '4-4',
        senderId: contacts[3].id,
        text: "Don't forget to bring the slides for tomorrow's presentation!",
        timestamp: "2025-07-02T21:15:00Z",
        read: false
      }
    ]
  }
];

export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0);
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    const daysDiff = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
}

export function getOtherParticipant(chat: Chat): User {
  return chat.participants.find(p => p.id !== CurrentUser.id) || chat.participants[0];
}