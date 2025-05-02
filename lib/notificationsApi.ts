import { supabase } from "./supabase";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention";
  sender_id: string;
  sender: {
    username: string;
    avatar: string;
  };
  post_id?: string;
  comment_id?: string;
  created_at: string;
  is_read: boolean;
}

export const notificationsAPI = {
  createNotification: async (
    recipient_id: string,
    type: "like" | "comment" | "follow" | "mention",
    sender_id: string,
    post_id?: string,
    comment_id?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          recipient_id, // Use receiver_id if you didn't rename
          type,
          sender_id,
          post_id,
          comment_id,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
  
      if (error) {
        console.error("Supabase error creating notification:", error);
        throw new Error(`Failed to create notification: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

  getNotifications: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          id,
          type,
          sender_id,
          post_id,
          comment_id,
          created_at,
          is_read,
          sender:users!sender_id (
            username,
            avatar
          )
        `
        )
        .eq("recipient_id", userId) // Use receiver_id if you didn't rename
        .order("created_at", { ascending: false })
        .limit(50);
  
      if (error) {
        console.error("Supabase error fetching notifications:", error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }
  
      return data.map((notification) => ({
        id: notification.id,
        type: notification.type,
        sender_id: notification.sender_id,
        sender: notification.sender || {
          username: "Unknown User",
          avatar: "https://via.placeholder.com/150",
        },
        post_id: notification.post_id,
        comment_id: notification.comment_id,
        created_at: notification.created_at,
        is_read: notification.is_read,
      })) as Notification[];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      console.log("Marking notification as read:", notificationId);
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .select();

      if (error) {
        console.error("Supabase error marking notification as read:", error);
        throw new Error(
          `Failed to mark notification as read: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
        console.warn("No notification found with ID:", notificationId);
        return null; // Handle case where notification doesn't exist
      }

      console.log("Notification marked as read:", data[0]);
      return data[0];
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      console.log("Marking all notifications as read for user:", userId);
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId) // Use receiver_id if you didn't rename
        .eq("is_read", false)
        .select();
  
      if (error) {
        console.error("Supabase error marking all notifications as read:", error);
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
      }
  
      console.log("Notifications marked as read:", data.length);
      return data;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  deleteNotification: async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  },
};
