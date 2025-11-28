import { Router } from "express";
import { auth, AuthedRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { User } from "../models/User";
import mongoose from "mongoose";

const router = Router();

// all routes below require auth
router.use(auth);

// List / search users
// GET /api/users?q=alice
router.get("/users", async (req: AuthedRequest, res) => {
  try {
    const q = (req.query.q as string) || "";
    const userId = req.userId;

    // Build filter: if q provided, search name or email (case-insensitive)
    let filter: any = {};
    if (q && q.trim().length > 0) {
      const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape q
      filter = { $or: [{ name: re }, { email: re }] };
    }

    // Exclude the requesting user
    if (userId) {
      filter._id = { $ne: userId };
    }

    // Limit results to reasonable number
    const users = await User.find(filter, "name email").limit(50).lean();

    res.json(users);
  } catch (err) {
    console.error("GET /api/users error", err);
    res.status(500).json({ error: "failed to fetch users" });
  }
});

// get user conversations with extra fields for frontend
router.get("/conversations", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  // Find conversations that include this user
  const conversations = await Conversation.find({ members: userId }).lean();

  // For each conversation, fetch last message and participants' info
  const results = await Promise.all(
    conversations.map(async (conv) => {
      const lastMsg = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .populate("sender", "name")
        .lean();

      // Count messages in conversation
      const messageCount = await Message.countDocuments({ conversationId: conv._id });

      // Basic unreadCount: 0 for now (you can implement per-user read cursors later)
      const unreadCount = 0;

      // Participants info
      const participants = await User.find({ _id: { $in: conv.members } }, "name").lean();

      return {
        id: conv._id,
        title: conv.title,
        members: conv.members,
        participants, // [{ _id, name }]
        lastMessage: lastMsg ? lastMsg.content : null,
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        unreadCount,
        createdAt: conv.createdAt,
        messageCount,
      };
    })
  );

  res.json(results);
});

// get messages for a conversation
router.get("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  const conversationId = req.params.id;
  // Optionally validate membership:
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  if (!conversation.members.map(String).includes(String(req.userId))) {
    return res.status(403).json({ error: "Not a member of this conversation" });
  }

  const messages = await Message.find({ conversationId })
    .populate("sender", "name")
    .sort({ createdAt: 1 })
    .lean();

  res.json(messages);
});

// create conversation
router.post("/conversations", async (req: AuthedRequest, res) => {
  const { title, memberIds } = req.body;
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "memberIds must be a non-empty array" });
  }

  const allMemberIds = Array.from(new Set([...memberIds, req.userId])).map((m: any) =>
    new mongoose.Types.ObjectId(m)
  );

  const conversation = await Conversation.create({
    title: title || "New Chat",
    members: allMemberIds,
  });

  // Return a conversation shaped like getConversations
  const participants = await User.find({ _id: { $in: conversation.members } }, "name").lean();

  res.json({
    id: conversation._id,
    title: conversation.title,
    members: conversation.members,
    participants,
    lastMessage: null,
    lastMessageTime: conversation.createdAt,
    unreadCount: 0,
    createdAt: conversation.createdAt,
    messageCount: 0,
  });
});

// send message (HTTP version)
router.post("/conversations/:id/messages", async (req: AuthedRequest, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId;
    const { content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: "Missing conversationId or content" });
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    if (!conv.members.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const saved = await Message.create({
      conversationId,
      sender: userId,
      content,
    });

    // populate sender name
    const populated = await Message.findById(saved._id).populate("sender", "name").lean();

    // emit to room (if you have io available)
    try {
      // if you export io from index.ts or attach io to app, use it. Otherwise skip.
      (req.app.get("io") as any)?.to(conversationId).emit("new_message", populated);
    } catch (e) {
      console.warn("emit failed (maybe io not attached)", e);
    }

    return res.json(populated);
  } catch (err) {
    console.error("POST /api/conversations/:id/messages error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// delete conversation
router.delete("/conversations/:id", async (req: AuthedRequest, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.members.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.json({ message: "Conversation deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/conversations/:id error:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
