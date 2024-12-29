import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide event title"],
  },  
  categories: {
    type: Array,
    required: [true, "Provide event category"],
  },
  description: {
    type: String,
    required: [true, "Provide event description"],
  },
  venue: {
    type: String,
    required: [true, "Provide event venue"],
  },
  date: {
    type: String,
    required: [true, "Provide event date"],
  },
  time: {
    type: String,
    required: [true, "Provide event time"],
  },
  banner: {
    type: Object,
    required: [true, "Provide event banner"],
  },
  images: {
    type: Array,
    required: [true, "Provide event images"],
  },
  videos: {
    type: Array,
    required: [true, "Provide event videos"],
  }
  
},
{
    timestamps: true,
  }
);

const Event = mongoose.model('Event', eventSchema)

export default Event;
