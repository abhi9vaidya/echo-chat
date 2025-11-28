import { Router } from "express";
import { auth, AuthedRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import { GroupInvitation } from "../models/GroupInvitation";
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
        name: conv.name,
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

// create conversation with invitations
router.post("/conversations", async (req: AuthedRequest, res) => {
  try {
    const { name, invitees = [] } = req.body;
    const creatorId = req.userId;

    // Create conversation with creator as sole member initially
    const conversation = await Conversation.create({
      name: name || "New Group",
      type: "group",
      members: [creatorId],
      createdBy: creatorId,
    });

    // Create invitations for each invitee
    const invitations = await Promise.all(
      invitees.map(async (inviteeId: string) => {
        // Skip if invitee is creator
        if (inviteeId === creatorId) return null;

        // Skip duplicate pending invites
        const existing = await GroupInvitation.findOne({
          conversation: conversation._id,
          invitee: inviteeId,
          status: "pending",
        });
        if (existing) return existing;

        const inv = await GroupInvitation.create({
          conversation: conversation._id,
          inviter: creatorId,
          invitee: inviteeId,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        return inv;
      })
    );

    // Emit socket events to invitees
    const io = req.app.get("io") as any;
    const creator = await User.findById(creatorId).lean();
    if (io && creator) {
      invitations.forEach((inv) => {
        if (inv) {
          const inviteeId = String(inv.invitee);
          const eventData = {
            id: inv._id,
            _id: inv._id,
            invitationId: inv._id,
            conversationId: conversation._id,
            conversationName: conversation.name,
            inviterName: creator.name,
            inviter: { id: creator._id, name: creator.name },
          };
          console.log(`[INVITE EVENT] Emitting to user:${inviteeId}`, eventData);
          io.to(`user:${inviteeId}`).emit("group:invite", eventData);
        }
      });
    } else {
      console.log("[INVITE EVENT] io not found or creator not found", { io: !!io, creator: !!creator });
    }

    // Return created conversation + invitations
    const participants = await User.find({ _id: { $in: conversation.members } }, "name").lean();

    res.status(201).json({
      conversation: {
        id: conversation._id,
        name: conversation.name,
        type: conversation.type,
        members: conversation.members,
        participants,
        createdBy: conversation.createdBy,
        createdAt: conversation.createdAt,
      },
      invitations: invitations.filter((i) => i !== null),
    });
  } catch (err) {
    console.error("POST /api/conversations error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
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

// get pending invitations for current user
router.get("/invitations/pending", async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId;

    const invites = await GroupInvitation.find({
      invitee: userId,
      status: "pending",
    })
      .populate("conversation", "name")
      .populate("inviter", "name")
      .lean();

    res.json(invites);
  } catch (err) {
    console.error("GET /api/invitations/pending error:", err);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

// respond to invitation (accept/decline)
router.post("/invitations/:id/respond", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const userId = req.userId;

    const invitation = await GroupInvitation.findById(id).populate("conversation").populate("inviter", "name");
    if (!invitation) return res.status(404).json({ error: "Invitation not found" });

    if (invitation.invitee.toString() !== userId!.toString()) {
      return res.status(403).json({ error: "Not authorized to respond to this invitation" });
    }

    invitation.status = accept ? "accepted" : "declined";
    await invitation.save();

    const io = req.app.get("io") as any;

    if (accept) {
      // Add invitee to conversation members
      await Conversation.findByIdAndUpdate(invitation.conversation._id, {
        $addToSet: { members: userId },
      });

      // Notify all conversation members that a new member joined
      if (io) {
        io.to(`conversation:${invitation.conversation._id}`).emit("group:memberAdded", {
          conversationId: invitation.conversation._id,
          userId,
          userName: (await User.findById(userId).lean())?.name,
        });

        // Notify inviter that invite was accepted
        io.to(`user:${invitation.inviter._id}`).emit("notification", {
          type: "inviteAccepted",
          conversationId: invitation.conversation._id,
          conversationName: (invitation.conversation as any).name,
          userId,
        });
      }
    } else {
      // Notify inviter of decline
      if (io) {
        io.to(`user:${invitation.inviter._id}`).emit("notification", {
          type: "inviteDeclined",
          conversationId: invitation.conversation._id,
          userId,
        });
      }
    }

    res.json({ status: invitation.status });
  } catch (err) {
    console.error("POST /api/invitations/:id/respond error:", err);
    res.status(500).json({ error: "Failed to respond to invitation" });
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
