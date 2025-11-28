import mongoose from "mongoose";

const groupInvitationSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invitee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "declined", "expired"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

export const GroupInvitation = mongoose.model("GroupInvitation", groupInvitationSchema);
