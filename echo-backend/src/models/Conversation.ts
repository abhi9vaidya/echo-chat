import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  title: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

export const Conversation = mongoose.model("Conversation", conversationSchema);
