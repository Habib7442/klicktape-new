import { supabase } from "@/lib/supabase";

export const messagesAPI = {
  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  getUserConversations: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return { documents: data };
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      throw error;
    }
  },

  markAsRead: async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
      
    if (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  },

  getUnreadCount: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("receiver_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in(
            "id",
            data.map((m) => m.id)
          );
      }

      return data.length;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  },

  getUnreadMessagesCount: async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error fetching unread messages count:", error);
      return 0;
    }
  },

  getConversationBetweenUsers: async (userId: string, otherUserId: string) => {
    try {
      // Validate inputs before querying
      if (!userId || !otherUserId) {
        throw new Error("Invalid userId or otherUserId");
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { documents: data };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      throw error;
    }
  },
};