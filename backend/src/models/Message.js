const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    media: {
      url: String,
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      kind: {
        type: String,
        enum: ["image", "video", "audio", "document"],
      },
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
    deletedForEveryoneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    hiddenFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.pre("validate", function () {
  if ((!this.text || !this.text.trim()) && !this.media?.url) {
    throw new Error("message text or media is required");
  }
});

module.exports = mongoose.model("Message", messageSchema);
