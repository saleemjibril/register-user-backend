import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, "Please provide type!"],
  },  
  mediaType: {
    type: String,
    required: [true, "Please provide media type!"],
  },  
  mediaUrl: {
    type: Object,
    required: [true, "Provide media"],
  }
},
{
    timestamps: true,
  }
);

const Media = mongoose.model('Media', mediaSchema)

export default Media;
