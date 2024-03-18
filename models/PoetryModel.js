import mongoose from "mongoose";

const poetrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide title"],
  },  
  poem: {
    type: String,
    required: [true, "Provide poem"],
  },  
  videoUrl: {
    type: Object,
    required: [true, "Provide video url"],
  }
},
{
    timestamps: true,
  }
);

const Poetry = mongoose.model('Poetry', poetrySchema)

export default Poetry;
