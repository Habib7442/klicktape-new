import { supabase } from "@/lib/supabase";

export const messagesAPI = {
  // Simple message sending without encryption
  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
    messageType: 'text' | 'shared_post' | 'shared_reel' = 'text'
  ) => {
    try {
      // Verify recipient exists
      const { data: receiver, error: receiverError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", receiverId)
        .single();

      if (receiverError || !receiver) {
        console.error('❌ Recipient not found:', {
          receiverId,
          error: receiverError?.message,
          code: receiverError?.code
        });
        throw new Error("Recipient does not exist");
      }

      // Store message in database
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          is_read: false,
          status: "sent",
          created_at: new Date().toISOString(),
        } as any)
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      console.log("✅ Message sent successfully:", (data as any).id);
      return data;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      throw new Error(`Failed to send message: ${(error as Error).message}`);
    }
  },

  // Get user conversations
  getUserConversations: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url),
          reply_to_message:messages!reply_to_message_id(
            id,
            content,
            sender_id,
            message_type,
            sender:profiles!sender_id(username)
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return { documents: data };
    } catch (error) {
      console.error("❌ Error fetching user conversations:", error);
      throw new Error(`Failed to fetch conversations: ${(error as Error).message}`);
    }
  },

  markAsRead: async (messageId: string, userId: string) => {
    try {
      const { data: message, error: checkError } = await supabase
        .from("messages")
        .select("is_read, receiver_id, sender_id")
        .eq("id", messageId as any)
        .single();

      if (checkError) throw checkError;

      // Only mark as read if current user is the receiver
      if ((message as any).receiver_id !== userId) {
        console.log("User is not the receiver of this message");
        return;
      }

      if ((message as any).is_read) {
        console.log("Message already read:", messageId);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          status: "read",
          read_at: new Date().toISOString()
        } as any)
        .eq("id", messageId as any)
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
        } as any)
        .eq("receiver_id", userId as any)
        .eq("sender_id", otherUserId as any)
        .eq("is_read", false as any)
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

  // Get conversation between two users
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
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url),
          reply_to_message:messages!reply_to_message_id(
            id,
            content,
            sender_id,
            message_type,
            sender:profiles!sender_id(username)
          )
        `)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return { documents: data };
    } catch (error) {
      console.error("❌ Error fetching conversation:", error);
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
          } as any,
          { onConflict: "user_id,chat_id" }
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

  // Send shared post message
  sendSharedPostMessage: async (
    senderId: string,
    receiverId: string,
    postData: {
      post_id: string;
      post_caption: string;
      post_image: string;
      post_owner: string;
    }
  ) => {
    try {
      const sharedPostContent = JSON.stringify({
        type: 'shared_post',
        ...postData,
        shared_by: senderId,
        shared_at: new Date().toISOString(),
      });

      return await messagesAPI.sendMessage(
        senderId,
        receiverId,
        sharedPostContent,
        'shared_post'
      );
    } catch (error) {
      console.error("❌ Error sending shared post message:", error);
      throw new Error(`Failed to send shared post: ${(error as Error).message}`);
    }
  },

  // Parse message content based on type
  parseMessageContent: (content: string, messageType: string = 'text') => {
    if (messageType === 'shared_post' || messageType === 'shared_reel') {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.error('Error parsing shared content:', error);
        return { type: 'text', content };
      }
    }
    return { type: 'text', content };
  },

  // Generate preview text for chat list
  getMessagePreview: (content: string, messageType: string = 'text') => {
    if (messageType === 'shared_post') {
      try {
        const parsedContent = JSON.parse(content);
        return `📷 Shared a post by @${parsedContent.post_owner}`;
      } catch (error) {
        return '📷 Shared a post';
      }
    }
    if (messageType === 'shared_reel') {
      try {
        const parsedContent = JSON.parse(content);
        return `🎥 Shared a reel by @${parsedContent.reel_owner}`;
      } catch (error) {
        return '🎥 Shared a reel';
      }
    }
    return content;
  },

  // Mark all unread messages from a specific sender as read
  markMessagesAsRead: async (senderId: string, receiverId: string) => {
    try {
      // Get all unread messages from the sender to the receiver
      const { data: unreadMessages, error: fetchError } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", senderId)
        .eq("receiver_id", receiverId)
        .eq("is_read", false);

      if (fetchError) throw fetchError;

      if (!unreadMessages || unreadMessages.length === 0) {
        console.log("No unread messages to mark as read");
        return [];
      }

      // Mark all unread messages as read
      const { data, error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          status: "read",
          read_at: new Date().toISOString()
        })
        .eq("sender_id", senderId)
        .eq("receiver_id", receiverId)
        .eq("is_read", false)
        .select();

      if (error) throw error;

      console.log(`✅ Marked ${data?.length || 0} messages as read`);
      return data || [];
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
      throw new Error(`Failed to mark messages as read: ${(error as Error).message}`);
    }
  },

  // Send a reply to a specific message
  sendReply: async (
    senderId: string,
    receiverId: string,
    content: string,
    replyToMessageId: string,
    messageType: 'text' | 'shared_post' | 'shared_reel' = 'text'
  ) => {
    try {
      // Verify recipient exists
      const { data: receiver, error: receiverError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", receiverId)
        .single();

      if (receiverError || !receiver) {
        console.error('❌ Recipient not found for reply:', {
          receiverId,
          error: receiverError?.message,
          code: receiverError?.code
        });
        throw new Error("Recipient does not exist");
      }

      // Verify the message being replied to exists
      const { data: originalMessage, error: messageError } = await supabase
        .from("messages")
        .select("id")
        .eq("id", replyToMessageId)
        .single();

      if (messageError || !originalMessage) {
        throw new Error("Original message does not exist");
      }

      // Store reply message in database
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          reply_to_message_id: replyToMessageId,
          is_read: false,
          status: "sent",
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url),
          reply_to_message:messages!reply_to_message_id(
            id,
            content,
            sender_id,
            message_type,
            sender:profiles!sender_id(username)
          )
        `)
        .single();

      if (error) throw error;

      console.log("✅ Reply sent successfully:", data.id);
      return data;
    } catch (error) {
      console.error("❌ Error sending reply:", error);
      throw new Error(`Failed to send reply: ${(error as Error).message}`);
    }
  },

  // Add or update emoji reaction to a message
  addReaction: async (messageId: string, userId: string, emoji: string) => {
    try {
      // Check if user already has a reaction on this message
      const { data: existingReaction, error: checkError } = await supabase
        .from("message_reactions")
        .select("id, emoji")
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          // Same emoji - remove the reaction
          const { error: deleteError } = await supabase
            .from("message_reactions")
            .delete()
            .eq("id", existingReaction.id);

          if (deleteError) throw deleteError;

          console.log("✅ Reaction removed successfully");
          return null; // Indicates reaction was removed
        } else {
          // Different emoji - update the reaction
          const { data, error: updateError } = await supabase
            .from("message_reactions")
            .update({ emoji, updated_at: new Date().toISOString() })
            .eq("id", existingReaction.id)
            .select()
            .single();

          if (updateError) throw updateError;

          console.log("✅ Reaction updated successfully");
          return data;
        }
      } else {
        // No existing reaction - add new one
        const { data, error: insertError } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: userId,
            emoji,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log("✅ Reaction added successfully");
        return data;
      }
    } catch (error) {
      console.error("❌ Error managing reaction:", error);
      throw new Error(`Failed to manage reaction: ${(error as Error).message}`);
    }
  },

  // Get reactions for a specific message
  getMessageReactions: async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select(`
          id,
          emoji,
          user_id,
          created_at,
          user:profiles!message_reactions_user_id_fkey(username, avatar_url)
        `)
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("❌ Error fetching message reactions:", error);
      throw new Error(`Failed to fetch reactions: ${(error as Error).message}`);
    }
  },

  // Get reactions for multiple messages (batch)
  getMessagesReactions: async (messageIds: string[]) => {
    try {
      if (!messageIds || messageIds.length === 0) return {};

      const { data, error } = await supabase
        .from("message_reactions")
        .select(`
          id,
          message_id,
          emoji,
          user_id,
          created_at
        `)
        .in("message_id", messageIds)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group reactions by message_id
      const groupedReactions = (data || []).reduce((acc, reaction) => {
        if (!acc[reaction.message_id]) {
          acc[reaction.message_id] = [];
        }
        acc[reaction.message_id].push(reaction);
        return acc;
      }, {} as Record<string, any[]>);

      return groupedReactions;
    } catch (error) {
      console.error("❌ Error fetching messages reactions:", error);
      throw new Error(`Failed to fetch reactions: ${(error as Error).message}`);
    }
  },

  // Delete message with proper authorization
  deleteMessage: async (messageId: string, userId: string) => {
    try {
      console.log("🗑️ API deleteMessage called:", { messageId, userId });

      // Check if this is a temporary message (not in database)
      if (messageId.startsWith('temp_')) {
        console.log("⚠️ Attempted to delete temporary message from database:", messageId);
        throw new Error("Cannot delete temporary message - it doesn't exist in database yet");
      }

      // First verify the user owns this message
      const { data: message, error: fetchError } = await supabase
        .from("messages")
        .select("id, sender_id")
        .eq("id", messageId)
        .single();

      if (fetchError) {
        console.error("❌ Error fetching message for deletion:", fetchError);
        throw new Error(`Failed to fetch message: ${fetchError.message}`);
      }

      if (!message) {
        throw new Error("Message not found");
      }

      if (message.sender_id !== userId) {
        throw new Error("You can only delete your own messages");
      }

      console.log("✅ Message found and authorized, proceeding with deletion:", message);

      // Delete the message (this will cascade delete reactions and replies due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", userId); // Extra safety check

      if (deleteError) {
        console.error("❌ Error deleting message:", deleteError);
        throw new Error(`Failed to delete message: ${deleteError.message}`);
      }

      console.log("✅ Message deleted successfully from database:", messageId);
      return { success: true, messageId };
    } catch (error) {
      console.error("❌ Error in deleteMessage:", error);
      throw error;
    }
  },

  // Clear entire chat with new behavior:
  // - Delete messages from database that the current user sent
  // - Mark chat as cleared for the current user (hides all messages from their interface)
  clearChat: async (userId: string, recipientId: string) => {
    try {
      // Step 1: Delete all messages sent by the current user to the specific recipient
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("sender_id", userId)
        .eq("receiver_id", recipientId);

      if (deleteError) {
        console.error("❌ Error deleting user's messages:", deleteError);
        throw new Error(`Failed to delete your messages: ${deleteError.message}`);
      }

      // Step 2: Mark this chat as cleared for the current user
      // This will hide all messages (including received ones) from their interface
      const { error: clearError } = await supabase
        .from("cleared_chats")
        .upsert({
          user_id: userId,
          other_user_id: recipientId,
          cleared_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,other_user_id'
        });

      if (clearError) {
        console.error("❌ Error marking chat as cleared:", clearError);
        throw new Error(`Failed to clear chat interface: ${clearError.message}`);
      }

      console.log("✅ Chat cleared successfully for user:", userId);
      console.log("  - Deleted user's sent messages from database");
      console.log("  - Marked chat as cleared to hide all messages from interface");

      return { success: true, userId, recipientId };
    } catch (error) {
      console.error("❌ Error in clearChat:", error);
      throw error;
    }
  },
};