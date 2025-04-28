import { supabase } from "@/lib/supabase";

export const roomsAPI = {
  getRooms: async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("participants_count", { ascending: false });

    if (error) throw error;
    return data;
  },

  createRoom: async (userId: string, name: string, description: string) => {
    const { error } = await supabase
      .from("rooms")
      .insert({
        name,
        description,
        creator_id: userId,
      });

    if (error) throw error;
  },

  checkJoinStatus: async (roomId: string, userId: string) => {
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) throw error;
    return data.length > 0;
  },

  joinRoom: async (roomId: string, userId: string) => {
    const { error } = await supabase
      .from("room_participants")
      .insert({ room_id: roomId, user_id: userId });

    if (error) throw error;
  },
};