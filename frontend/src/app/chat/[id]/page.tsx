import ChatWindow from '@/components/chat/ChatWindow';

interface ChatPageProps {
  params: { id: string };
}

export default function ChatPage({ params }: ChatPageProps) {
  return <ChatWindow conversationId={params.id} />;
}
