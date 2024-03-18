import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Provide name"],
  },  
  position: {
    type: String,
    required: [true, "Provide position"],
  },  
  testimonial: {
    type: Object,
    required: [true, "Provide testimonial"],
  },
  media: {
    type: Object,
    required: [true, "Provide media url"],
  }
},
{
    timestamps: true,
  }
);

const Testimonial = mongoose.model('Testimonial', testimonialSchema)

export default Testimonial;
