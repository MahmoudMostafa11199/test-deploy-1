import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.method("toJSON", function () {
  const { password, __v, ...user } = this.toObject({ virtuals: true });
  return user;
});

export default mongoose.model("User", userSchema);
