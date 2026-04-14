import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    collectionId: { type: String, default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

bookmarkSchema.index({ title: "text", url: "text" });
bookmarkSchema.index({ owner: 1 });
bookmarkSchema.index({ tags: 1 });

export default mongoose.model("Bookmark", bookmarkSchema);
