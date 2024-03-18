import mongoose from "mongoose";

const bioModel = new mongoose.Schema({
  bio: {
    type: String,
    required: [true, "Provide bio"],
  },
  image: {
    type: Object,
    required: [true, "Provide bio image"],
  }
},
{
    timestamps: true,
  }
);

const Bio = mongoose.model('Bio', bioModel)

export default Bio;
