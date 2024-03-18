import Speaking from "../models/SpeakingModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createSpeaking = catchAsync(async (req, res, next) => {

  const newSpeaking = await Speaking.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Speaking uploaded successfully",
  });
});

export const updateSpeaking = catchAsync(async (req, res) => {
  try {
    const updated = await Speaking.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Speaking updated successfully",
    });
  } catch (err) {
    console.log("SEPAKING UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const getAllSpeakings = catchAsync(async (req, res) => {
  try {
    let speaking = await Speaking.find({})
    res.status(200).json({
      status: "success",
      speaking
    });
  } catch (err) {
    console.log("SPEAKING FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const deleteSpeaking = catchAsync(async (req, res) => {
  try {
    const deleted = await Speaking.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(204).json({
      status: 'success',
      message:
      "Speaking deleted successfully",
    })
  } catch (err) {
    console.log("SPEAKING DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getSpeaking = catchAsync(async (req, res) => {
  try {
    const speaking = await Speaking.findById(req.params.id);
    res.status(200).json({
      status: "success",
      speaking
    });
  } catch (err) {
    console.log("SPEAKING FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});