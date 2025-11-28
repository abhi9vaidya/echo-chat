import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import jwt from "jsonwebtoken";
import { Message } from "./models/Message";
import { User } from "./models/User";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", chatRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const onlineUsers = new Map<string, boolean>();
const userInfo = new Map<string, { name: string; email: string }>();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

io.use((socket, next) => {
  const token = (socket.handshake.auth as any)?.token;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  const userId = (socket as any).userId as string;
  console.log("user connected", userId);

  // presence on connect
  onlineUsers.set(userId, true);
  const userInfoData = userInfo.get(userId);
  io.emit("user_connected", { userId, name: userInfoData?.name, email: userInfoData?.email, online: true });

  socket.on("register", (user: { id: string; name?: string; email?: string }) => {
    // Store user info for presence
    userInfo.set(user.id, { name: user.name || "", email: user.email || "" });
    console.log("User registered:", user);
  });

  socket.on("get_online_users", () => {
    const users = Array.from(onlineUsers.keys()).map(id => {
      const info = userInfo.get(id);
      return { userId: id, name: info?.name, email: info?.email, online: true };
    });
    socket.emit("online_users", users);
  });

  socket.on("join_conversation", (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on("send_message", async (data: { conversationId: string; content: string }) => {
    try {
      if (!data?.conversationId || !data?.content) return;

      // Save message to DB
      const saved = await Message.create({
        conversationId: data.conversationId,
        sender: (socket as any).userId,
        content: data.content,
      });

      // Re-query to get populated sender name (works with Mongoose v6/v7)
      const populated = await Message.findById(saved._id).populate("sender", "name").lean();

      const emitMsg = {
        _id: populated?._id || saved._id,
        conversationId: populated?.conversationId || saved.conversationId,
        senderId: String(populated?.sender?._id || saved.sender),
        senderName: (populated?.sender as { name?: string })?.name || "",
        content: populated?.content || saved.content,
        timestamp: (populated?.createdAt || saved.createdAt).toISOString(),
      };

      // Emit to room
      io.to(String(data.conversationId)).emit("new_message", emitMsg);
    } catch (err) {
      console.error("send_message error:", err);
    }
  });

  socket.on("typing", (conversationId: string) => {
    const userId = (socket as any).userId;
    socket.to(conversationId).emit("user_typing", { userId, conversationId });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("user_disconnected", { userId, online: false });
  });
});

mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/echo-chat")
  .then(() => {
    const port = Number(process.env.PORT || 4000);
    server.listen(port, () => console.log(`Backend on http://localhost:${port}`));
  });
