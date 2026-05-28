import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'blog'], required: true },
  url: { type: String, required: true },
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
  day: { type: String, required: true },
  date_range: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  emoji: { type: String, required: true },
  emojiDominantColor: { type: String, required: true },
  emojiDominantDarkerColor: { type: String, required: true },
  shouldContainResources: { type: Boolean, required: true },
  resources: [resourceSchema],
}, { _id: false });

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
    },
    timeline: [milestoneSchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    forkedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Roadmap = mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
