import mongoose from "mongoose";

const speakingSchema = new mongoose.Schema({
  event: {
    type: String,
    required: [true, "Provide event name"],
  },  
  location: {
    type: String,
    required: [true, "Provide location"],
  },  
  date: {
    type: String,
    required: [true, "Provide date"],
  },  
  media: {
    type: Object,
    required: [true, "Provide event image"],
  }
},
{
    timestamps: true,
  }
);

const Speaking = mongoose.model('Speaking', speakingSchema)

export default Speaking;
