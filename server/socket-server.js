require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO with React Native compatibility
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, specify your app's domain
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Start with polling for React Native
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// Store active users and their rooms
const activeUsers = new Map();
const userRooms = new Map();

// Initialize Supabase client with service role for database updates
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Handle user joining a chat room
  socket.on('join_chat', ({ userId, chatId }) => {
    console.log(`🏠 User ${userId} joining chat ${chatId}`);
    
    // Leave previous rooms
    const previousRooms = userRooms.get(userId) || [];
    previousRooms.forEach(room => {
      socket.leave(room);
      console.log(`🚪 User ${userId} left room ${room}`);
    });

    // Join new room
    socket.join(chatId);
    userRooms.set(userId, [chatId]);
    activeUsers.set(socket.id, { userId, chatId });
    
    console.log(`✅ User ${userId} joined chat room ${chatId}`);
    
    // Notify others in the room that user is online
    socket.to(chatId).emit('user_status', { userId, online: true });
  });

  // Handle leaving a chat room
  socket.on('leave_chat', ({ chatId }) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.leave(chatId);
      console.log(`🚪 User ${user.userId} left chat ${chatId}`);
      
      // Notify others that user left
      socket.to(chatId).emit('user_status', { userId: user.userId, online: false });
    }
  });

  // Handle sending messages
  socket.on('send_message', async (message) => {
    console.log(`📤 Message from ${message.sender_id} to ${message.receiver_id}`, {
      id: message.id,
      timestamp: message.created_at,
      hasContent: !!message.content
    });

    // Create chat room ID from sender and receiver
    const chatId = [message.sender_id, message.receiver_id].sort().join('-');

    // Broadcast message to all users in the chat room
    io.to(chatId).emit('new_message', message);

    console.log(`📨 Message broadcasted to room ${chatId}`);

    // Automatically mark message as "delivered" since it reached the server
    // This happens regardless of whether recipient is online (like WhatsApp)
    if (!message.id.startsWith('temp_') && !message.id.startsWith('msg_')) {
      try {
        console.log(`🔄 Marking real message ${message.id} as delivered in database`);
        const { error } = await supabase
          .from('messages')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (error) {
          console.error('❌ Failed to mark message as delivered:', error);
        } else {
          console.log(`✅ Message ${message.id} automatically marked as delivered`);

          // Broadcast delivery status to all users in chat
          io.to(chatId).emit('message_status_update', {
            messageId: message.id,
            status: 'delivered',
            isRead: false
          });
          console.log(`📡 Delivered status broadcasted for message ${message.id}`);
        }
      } catch (dbError) {
        console.error('❌ Database error marking as delivered:', dbError);
      }
    } else {
      console.log(`⚠️ Skipping database update for temporary/socket message: ${message.id}`);
    }
  });

  // Handle typing status
  socket.on('typing_status', (data) => {
    console.log(`⌨️ Typing status from ${data.userId}: ${data.isTyping}`);
    
    // Broadcast typing status to others in the chat room
    socket.to(data.chatId).emit('typing_update', data);
  });

  // Handle emoji reactions
  socket.on('add_reaction', async (data) => {
    console.log(`😀 Reaction from ${data.userId}: ${data.emoji} on message ${data.messageId}`);

    try {
      // First check if user already has this exact reaction
      const { data: existingReaction, error: checkError } = await supabase
        .from("message_reactions")
        .select("id, emoji")
        .eq("message_id", data.messageId)
        .eq("user_id", data.userId)
        .single();

      // Handle check error (ignore "no rows found" error)
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing reaction:', checkError);
        throw checkError;
      }

      let reactionResult = null;

      if (existingReaction && existingReaction.emoji === data.emoji) {
        // Same emoji - remove the reaction (toggle off)
        const { error: deleteError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (deleteError) throw deleteError;

        console.log("✅ Reaction removed successfully");
        reactionResult = { action: 'removed', emoji: data.emoji };
      } else {
        // Different emoji or no existing reaction - upsert
        const { data: upsertedReaction, error: upsertError } = await supabase
          .from("message_reactions")
          .upsert({
            message_id: data.messageId,
            user_id: data.userId,
            emoji: data.emoji,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'message_id,user_id',
            ignoreDuplicates: false
          })
          .select('emoji')
          .single();

        if (upsertError) {
          console.error('❌ Upsert error:', upsertError);
          throw upsertError;
        }

        console.log("✅ Reaction upserted successfully:", upsertedReaction?.emoji);
        reactionResult = {
          action: existingReaction ? 'updated' : 'added',
          emoji: data.emoji,
          oldEmoji: existingReaction?.emoji
        };
      }

      // Find the chat room and broadcast reaction update
      const user = activeUsers.get(socket.id);
      if (user && reactionResult) {
        const reactionUpdate = {
          messageId: data.messageId,
          userId: data.userId,
          emoji: data.emoji,
          action: reactionResult.action,
          oldEmoji: reactionResult.oldEmoji
        };

        io.to(user.chatId).emit('reaction_update', reactionUpdate);
        console.log(`📡 Reaction update broadcasted to room ${user.chatId}:`, reactionUpdate);
      }
    } catch (dbError) {
      console.error('❌ Database error handling reaction:', dbError);
    }
  });

  // Handle message status updates (delivered/read)
  socket.on('message_status', async (data) => {
    console.log(`📊 Message status update: ${data.messageId} -> ${data.status}`);

    try {
      // First check current message status to avoid unnecessary updates
      const { data: currentMessage, error: fetchError } = await supabase
        .from('messages')
        .select('status, is_read')
        .eq('id', data.messageId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch current message status:', fetchError);
        return;
      }

      // Check if update is actually needed
      const isAlreadyRead = currentMessage.is_read === true && data.status === 'read';
      const isAlreadyDelivered = currentMessage.status === 'delivered' && data.status === 'delivered';

      if (isAlreadyRead || isAlreadyDelivered) {
        console.log(`⚠️ Message ${data.messageId} already has status ${data.status}, skipping update`);
        return; // Don't update or broadcast if already in target state
      }

      // Update message status in database
      const updateData = {
        status: data.status,
        ...(data.status === 'delivered' && { delivered_at: new Date().toISOString() }),
        ...(data.status === 'read' && {
          is_read: true,
          read_at: new Date().toISOString()
        })
      };

      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', data.messageId);

      if (error) {
        console.error('❌ Failed to update message status in database:', error);
      } else {
        console.log(`✅ Message ${data.messageId} status updated to ${data.status} in database`);

        // Only broadcast if database update was successful
        const user = activeUsers.get(socket.id);
        if (user) {
          socket.to(user.chatId).emit('message_status_update', data);
          console.log(`📡 Status update broadcasted to room ${user.chatId}`);
        }
      }
    } catch (dbError) {
      console.error('❌ Database update error:', dbError);
    }
  });

  // Handle user disconnect
  socket.on('disconnect', (reason) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`❌ User ${user.userId} disconnected: ${reason}`);
      
      // Notify others that user went offline
      if (user.chatId) {
        socket.to(user.chatId).emit('user_status', { userId: user.userId, online: false });
      }
      
      // Clean up
      activeUsers.delete(socket.id);
      userRooms.delete(user.userId);
    } else {
      console.log(`❌ Unknown user disconnected: ${socket.id}`);
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`🔥 Socket error for ${socket.id}:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeConnections: io.engine.clientsCount,
    activeUsers: activeUsers.size
  });
});

// Get active users endpoint
app.get('/active-users', (req, res) => {
  const users = Array.from(activeUsers.values());
  res.json({ activeUsers: users });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Android emulator: http://10.0.2.2:${PORT}/health`);
  console.log(`🌐 Network access (old): http://192.168.52.201:${PORT}/health`);
  console.log(`🌐 Network access (new): http://192.168.38.201:${PORT}/health`);
  
  // Get and display actual network interfaces
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log('\n📡 Available network interfaces:');
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`   ${interfaceName}: http://${interface.address}:${PORT}/health`);
      }
    });
  });
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
