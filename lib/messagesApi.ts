import { supabase } from "@/lib/supabase";

export const messagesAPI = {
  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string
  ) => {
    try {
      const { data: receiver, error: receiverError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", receiverId)
        .single();

      if (receiverError || !receiver) {
        throw new Error("Recipient does not exist");
      }

      // Send message with optimistic update support
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          is_read: false,
          status: "sent",
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .single();

      if (error) throw error;
      console.log("Message sent successfully:", data.id);
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error(`Failed to send message: ${(error as Error).message}`);
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
      throw new Error(`Failed to fetch conversations: ${(error as Error).message}`);
    }
  },

  markAsRead: async (messageId: string, userId: string) => {
    try {
      const { data: message, error: checkError } = await supabase
        .from("messages")
        .select("is_read, receiver_id, sender_id")
        .eq("id", messageId)
        .single();

      if (checkError) throw checkError;

      // Only mark as read if current user is the receiver
      if (message.receiver_id !== userId) {
        console.log("User is not the receiver of this message");
        return;
      }

      if (message.is_read) {
        console.log("Message already read:", messageId);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          status: "read",
          read_at: new Date().toISOString()
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      console.log("Message marked as read:", messageId);
      return data;
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw new Error(`Failed to mark message as read: ${(error as Error).message}`);
    }
  },

  markAsDelivered: async (messageId: string) => {
    try {
      const { data: message, error: checkError } = await supabase
        .from("messages")
        .select("status")
        .eq("id", messageId)
        .single();

      if (checkError) throw checkError;

      // Only update if status is still "sent"
      if (message.status !== "sent") {
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString()
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      console.log("Message marked as delivered:", messageId);
      return data;
    } catch (error) {
      console.error("Error marking message as delivered:", error);
      throw new Error(`Failed to mark message as delivered: ${(error as Error).message}`);
    }
  },

  markConversationAsRead: async (userId: string, otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          status: "read",
          read_at: new Date().toISOString()
        })
        .eq("receiver_id", userId)
        .eq("sender_id", otherUserId)
        .eq("is_read", false)
        .select();

      if (error) throw error;
      console.log(`Marked ${data.length} messages as read in conversation`);
      return data;
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      throw new Error(`Failed to mark conversation as read: ${(error as Error).message}`);
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
          .update({ is_read: true, status: "read" })
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
      if (!userId || !otherUserId) {
        throw new Error("Invalid userId or otherUserId");
      }

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return { documents: data };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      throw new Error(`Failed to fetch conversation: ${(error as Error).message}`);
    }
  },

  setTypingStatus: async (userId: string, chatId: string, isTyping: boolean) => {
    try {
      if (!userId || !chatId) {
        throw new Error("Invalid userId or chatId");
      }

      const { data, error } = await supabase
        .from("typing_status")
        .upsert(
          {
            user_id: userId,
            chat_id: chatId,
            is_typing: isTyping,
            updated_at: new Date().toISOString(),
          },
          { onConflict: ["user_id", "chat_id"] }
        )
        .select()
        .single();

      if (error) throw error;
      console.log("Typing status updated:", { userId, chatId, isTyping });
      return data;
    } catch (error) {
      console.error("Error setting typing status:", error);
      throw new Error(`Failed to set typing status: ${(error as Error).message}`);
    }
  },
};