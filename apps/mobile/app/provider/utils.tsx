import { Chats } from "@/constants/chats";

export function loadUserChat(userId: string) {
    return Chats.filter(c => c.participants[1].id === userId)[0]
}