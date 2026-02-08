import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, UserCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface MessageDialogProps {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  listingId?: string;
  listingTitle?: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  isBot?: boolean;
  timestamp: Date;
}

export const MessageDialog = ({
  sellerId,
  sellerName,
  sellerAvatar,
  listingId,
  listingTitle,
  onClose,
}: MessageDialogProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, markAsRead } = useMessages(listingId, sellerId);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isBotMode, setIsBotMode] = useState(true);
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, messages]);

  // Initialize with welcome message if no previous messages
  useEffect(() => {
    if (!loading && messages.length === 0 && chatMessages.length === 0 && isBotMode) {
      setChatMessages([{
        id: 'welcome',
        content: `Kumusta! 👋 Ako ang AI assistant ni ${sellerName}. Paano kita matutulungan tungkol sa ${listingTitle || 'item na ito'}? Pwede mo akong tanungin tungkol sa produkto, payment, o delivery. Kung gusto mong makipag-usap directly sa seller, sabihin mo lang!`,
        isFromUser: false,
        isBot: true,
        timestamp: new Date(),
      }]);
    }
  }, [loading, messages.length, chatMessages.length, isBotMode, sellerName, listingTitle]);

  // Convert real messages to chat format
  useEffect(() => {
    if (messages.length > 0 && !isBotMode) {
      const converted: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isFromUser: msg.sender_id === user?.id,
        isBot: false,
        timestamp: new Date(msg.created_at),
      }));
      setChatMessages(converted);
    }
  }, [messages, isBotMode, user?.id]);

  useEffect(() => {
    // Mark unread messages as read
    const unreadIds = messages
      .filter(m => m.receiver_id === user?.id && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [messages, user, markAsRead]);

  const handleBotChat = async (userMessage: string) => {
    const userChatMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: userMessage,
      isFromUser: true,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userChatMsg]);
    setBotTyping(true);

    try {
      // Build conversation history for context
      const conversationHistory = chatMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.isFromUser ? 'user' : 'assistant',
          content: m.content,
        }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          buyerMessage: userMessage,
          sellerId,
          listingId,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const botChatMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        content: data.message || "Pasensya, may problema sa connection. Gusto mo bang makipag-usap directly sa seller?",
        isFromUser: false,
        isBot: true,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, botChatMsg]);

      // If AI suggests connecting to human
      if (data.needsHuman) {
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            id: `connect-${Date.now()}`,
            content: "📞 I'll connect you with the seller now. Your messages will be sent directly to them.",
            isFromUser: false,
            isBot: true,
            timestamp: new Date(),
          }]);
          setIsBotMode(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Bot chat error:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        content: "Sorry, may problema sa connection. I-try mo ulit o makipag-usap directly sa seller.",
        isFromUser: false,
        isBot: true,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setBotTyping(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    if (isBotMode) {
      // Check if user wants to talk to human
      const wantsHuman = /seller|human|tao|kausap|real person|actual|direct/i.test(messageText);
      
      if (wantsHuman) {
        setChatMessages(prev => [...prev, {
          id: `user-${Date.now()}`,
          content: messageText,
          isFromUser: true,
          timestamp: new Date(),
        }, {
          id: `connect-${Date.now()}`,
          content: `Sige! I'll connect you with ${sellerName} now. Your messages will be sent directly to them. 📞`,
          isFromUser: false,
          isBot: true,
          timestamp: new Date(),
        }]);
        
        setTimeout(() => {
          setIsBotMode(false);
        }, 1500);
        return;
      }

      await handleBotChat(messageText);
    } else {
      // Send to actual seller
      setSending(true);
      const { error } = await sendMessage(messageText, sellerId, listingId);
      setSending(false);

      if (error) {
        toast.error('Failed to send message');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const connectToSeller = () => {
    setChatMessages(prev => [...prev, {
      id: `connect-${Date.now()}`,
      content: `Connecting you with ${sellerName}... Your next messages will go directly to them.`,
      isFromUser: false,
      isBot: true,
      timestamp: new Date(),
    }]);
    setTimeout(() => setIsBotMode(false), 1000);
  };

  const displayMessages = isBotMode ? chatMessages : chatMessages.filter(m => !m.isBot);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in flex flex-col h-[600px] max-h-[80vh]">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="relative">
              <img
                src={sellerAvatar}
                alt={sellerName}
                className="w-10 h-10 rounded-full object-cover"
              />
              {isBotMode && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                {sellerName}
                {isBotMode && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    AI Assistant
                  </span>
                )}
              </h3>
              {listingTitle && (
                <p className="text-sm text-muted-foreground truncate">
                  Re: {listingTitle}
                </p>
              )}
            </div>
            {isBotMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={connectToSeller}
                className="text-xs"
              >
                <UserCircle className="w-3 h-3 mr-1" />
                Talk to Seller
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && !isBotMode ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : displayMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No messages yet.</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.isFromUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!msg.isFromUser && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.isBot ? "bg-primary/10" : "bg-secondary"
                    )}>
                      {msg.isBot ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <img src={sellerAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] p-3 rounded-2xl',
                      msg.isFromUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : msg.isBot
                        ? 'bg-gradient-to-br from-secondary to-secondary/80 rounded-bl-sm'
                        : 'bg-secondary rounded-bl-sm'
                    )}
                  >
                    {msg.isBot ? (
                      <div className="prose prose-sm dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className={cn(
                      'text-xs mt-1',
                      msg.isFromUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {format(msg.timestamp, 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
            {botTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl px-4 py-3 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mode indicator */}
          {!isBotMode && (
            <div className="px-4 py-2 bg-primary/10 border-t border-primary/20">
              <p className="text-xs text-primary text-center flex items-center justify-center gap-1">
                <UserCircle className="w-3 h-3" />
                Connected directly to {sellerName}
              </p>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isBotMode ? "Ask about this item..." : `Message ${sellerName}...`}
                className="flex-1"
                disabled={sending || botTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending || botTyping}
                size="icon"
                className="hero-gradient border-0"
              >
                {sending || botTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};