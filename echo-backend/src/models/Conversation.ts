import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["direct", "group"], default: "group" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Conversation = mongoose.model("Conversation", conversationSchema);
