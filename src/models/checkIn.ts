import mongoose from "mongoose";

const checkinSchema = new mongoose.Schema({
  username: String,
  chat_instance: String,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model(process.env.MONGO_NAME, checkinSchema);
