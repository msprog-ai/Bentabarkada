import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  listingId: string | null;
}

export const useMessages = (listingId?: string, sellerId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user || !sellerId) return;

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${sellerId}),and(sender_id.eq.${sellerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sellerId, listingId]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      if (!data) return;

      // Group messages by conversation partner
      const convMap = new Map<string, Message[]>();
      data.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, []);
        }
        convMap.get(partnerId)!.push(msg);
      });

      // Fetch partner profiles
      const partnerIds = Array.from(convMap.keys());
      const { data: profiles } = await supabase
        .from('profiles_public' as any)
        .select('user_id, display_name, avatar_url')
        .in('user_id', partnerIds) as { data: { user_id: string; display_name: string; avatar_url: string }[] | null };

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const convList: Conversation[] = Array.from(convMap.entries()).map(([partnerId, msgs]) => {
        const profile = profileMap.get(partnerId);
        const unreadCount = msgs.filter(m => m.receiver_id === user.id && !m.is_read).length;
        const lastMsg = msgs[0];

        return {
          partnerId,
          partnerName: profile?.display_name || 'User',
          partnerAvatar: profile?.avatar_url || `https://i.pravatar.cc/100?u=${partnerId}`,
          lastMessage: lastMsg.content,
          lastMessageTime: lastMsg.created_at,
          unreadCount,
          listingId: lastMsg.listing_id,
        };
      });

      setConversations(convList);
    } catch (error) {
      console.error('Error in fetchConversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendMessage = async (content: string, receiverId: string, listingId?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingId || null,
      content,
    });

    if (!error) {
      fetchMessages();
    }

    return { error };
  };

  const markAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('receiver_id', user.id);
  };

  useEffect(() => {
    if (sellerId) {
      fetchMessages();
    } else {
      fetchConversations();
    }
  }, [fetchMessages, fetchConversations, sellerId]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            if (sellerId) {
              fetchMessages();
            } else {
              fetchConversations();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sellerId, fetchMessages, fetchConversations]);

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    markAsRead,
    refetch: sellerId ? fetchMessages : fetchConversations,
  };
};
