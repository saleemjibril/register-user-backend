import Testimonial from "../models/TestimonialModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createTestimonial = catchAsync(async (req, res, next) => {

  const newPoem = await Testimonial.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Testimonial uploaded successfully",
  });
});

export const updateTestimonial = catchAsync(async (req, res) => {
  try {
    console.log('body', req.body);
    const updated = await Testimonial.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Testimonial updated successfully",
    });
  } catch (err) {
    console.log("TESTIMONIAL UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const getAllTestimonials = catchAsync(async (req, res) => {
  try {
    let testimonial = await Testimonial.find({})
    res.status(200).json({
      status: "success",
      testimonial
    });
  } catch (err) {
    console.log("TESTIMONIAL FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const deleteTestimonial = catchAsync(async (req, res) => {
  try {
    const deleted = await Testimonial.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(204).json({
      status: 'success',
      message:
      "Poem deleted successfully",
    })
  } catch (err) {
    console.log("TESTIMONIAL DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getTestimonial = catchAsync(async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    res.status(200).json({
      status: "success",
      testimonial
    });
  } catch (err) {
    console.log("TESTIMONIAL FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});