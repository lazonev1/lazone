import { ScrollView } from "react-native-gesture-handler";
import MessageListItem from "@/components/messages/MessageListItem"
import { useRouter } from 'expo-router';



export default function MessageList() {
    const router = useRouter();
    
    return (
        <ScrollView>
            {
                [   {id: 0, sender: "John Doe", text: "Following up on the stuff...", time: "09:33 PM"},
                    {id: 1, sender: "Mensah Afiavi", text: "How is the work going", time: "09:33 PM"},
                    {id: 2, sender: "Alexandro Volta", text: "The payment has been processed", time: "09:33 PM"}
                ].map((message) => (
                    <MessageListItem
                        key={message.id}
                        sender={message.sender}
                        text={message.text}
                        time={message.time}
                        onPress={() => router.push(`/messages/chat/${message.id}`)}
                    />
                ))
            }
        </ScrollView>
    )
}