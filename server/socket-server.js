const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

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
  socket.on('send_message', (message) => {
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
  });

  // Handle typing status
  socket.on('typing_status', (data) => {
    console.log(`⌨️ Typing status from ${data.userId}: ${data.isTyping}`);
    
    // Broadcast typing status to others in the chat room
    socket.to(data.chatId).emit('typing_update', data);
  });

  // Handle message status updates (delivered/read)
  socket.on('message_status', (data) => {
    console.log(`📊 Message status update: ${data.messageId} -> ${data.status}`);
    
    // Find the chat room and broadcast status update
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.chatId).emit('message_status_update', data);
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
