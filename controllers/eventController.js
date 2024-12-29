import Event from "../models/EventModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createEvent = catchAsync(async (req, res, next) => {

  try {
    const newEvent = await Event.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Event created successfully",
  });
  } catch (error) {
    console.log("EVENT UPDATE ERROR ----> ", error);
    res.status(400).json({
      error: error.message,
    });
  }
});

export const updateEvent = catchAsync(async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Event updated successfully",
    });
  } catch (err) {
    console.log("EVENT UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});


export const getEvent = catchAsync(async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    console.log("EVENT FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getAllEvents = catchAsync(async (req, res) => {
  try {
    let events = await Event.find({})
    res.status(200).json(
      [...events]
    );
  } catch (err) {
    console.log("EVENT FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const deleteEvent = catchAsync(async (req, res, next) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(204).json({
      status: 'success',
      message:
      "Event deleted successfully",
    })
  } catch (err) {
    console.log("EVENT DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
