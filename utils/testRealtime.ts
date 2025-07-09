import { supabase } from '@/lib/supabase';

export const testRealtimeConnection = async (userId: string, recipientId: string) => {
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  const chatId = [userId, recipientId].sort().join('-');
  const [user1, user2] = chatId.split('-');
  const filter = `or(and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1}))`;

  console.log('🔥 TESTING REALTIME CONNECTION');
  console.log('🔥 User ID:', userId);
  console.log('🔥 Recipient ID:', recipientId);
  console.log('🔥 Chat ID:', chatId);
  console.log('🔥 Filter:', filter);

  const channel = supabase
    .channel(`test_messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter,
      },
      (payload) => {
        console.log('🔥 ✅ REALTIME TEST: New message received!', payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter,
      },
      (payload) => {
        console.log('🔥 ✅ REALTIME TEST: Message updated!', payload.new);
      }
    )
    .subscribe((status, error) => {
      console.log('🔥 REALTIME TEST: Subscription status:', status);
      if (error) {
        console.error('🔥 REALTIME TEST: Subscription error:', error);
      }
      if (status === 'SUBSCRIBED') {
        console.log('🔥 ✅ REALTIME TEST: Successfully subscribed!');
      }
    });

  // Return cleanup function
  return () => {
    console.log('🔥 REALTIME TEST: Cleaning up test subscription');
    supabase.removeChannel(channel);
  };
};

export const sendTestMessage = async (senderId: string, receiverId: string, content: string) => {
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  console.log('🔥 SENDING TEST MESSAGE');
  console.log('🔥 From:', senderId);
  console.log('🔥 To:', receiverId);
  console.log('🔥 Content:', content);

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        is_read: false,
        status: 'sent',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('🔥 ❌ Failed to send test message:', error);
      throw error;
    }

    console.log('🔥 ✅ Test message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('🔥 ❌ Error sending test message:', error);
    throw error;
  }
};
