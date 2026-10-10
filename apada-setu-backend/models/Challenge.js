import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], required: true },
    status: { type: Number, default: 3 },
    location: { type: String, default: "Location pending" },
    duplicate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", challengeSchema);