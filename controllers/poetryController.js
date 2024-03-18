import Poetry from "../models/PoetryModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createPoem = catchAsync(async (req, res, next) => {

  const newPoem = await Poetry.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Poem uploaded successfully",
  });
});

export const updatePoem = catchAsync(async (req, res) => {
  try {
    const updated = await Poetry.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Poem updated successfully",
    });
  } catch (err) {
    console.log("POEM UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const getAllPoems = catchAsync(async (req, res) => {
  try {
    let poetry = await Poetry.find({})
    res.status(200).json({
      status: "success",
      poetry
    });
  } catch (err) {
    console.log("POEMS FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const deletePoem = catchAsync(async (req, res) => {
  try {
    const deleted = await Poetry.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(204).json({
      status: 'success',
      message:
      "Poem deleted successfully",
    })
  } catch (err) {
    console.log("POEMS DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getPoem = catchAsync(async (req, res) => {
  try {
    const poem = await Poetry.findById(req.params.id);
    res.status(200).json({
      status: "success",
      poem
    });
  } catch (err) {
    console.log("POEM FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});