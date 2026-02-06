import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageDialogProps {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  listingId?: string;
  listingTitle?: string;
  onClose: () => void;
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
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark unread messages as read
    const unreadIds = messages
      .filter(m => m.receiver_id === user?.id && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [messages, user, markAsRead]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const { error } = await sendMessage(newMessage.trim(), sellerId, listingId);
    setSending(false);

    if (!error) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-card rounded-2xl card-shadow overflow-hidden animate-scale-in flex flex-col h-[600px] max-h-[80vh]">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <img
              src={sellerAvatar}
              alt={sellerName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{sellerName}</h3>
              {listingTitle && (
                <p className="text-sm text-muted-foreground truncate">
                  Re: {listingTitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No messages yet.</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[80%] p-3 rounded-2xl',
                    msg.sender_id === user?.id
                      ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary rounded-bl-sm'
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={cn(
                    'text-xs mt-1',
                    msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="hero-gradient border-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
