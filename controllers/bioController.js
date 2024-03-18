import Bio from "../models/bioModel.js";
import catchAsync from "../utils/catchAsync.js";



export const updateBio = catchAsync(async (req, res) => {
  try {
    const updated = await Bio.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Bio updated successfully",
    });
  } catch (err) {
    console.log("BIO UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});


export const getBio = catchAsync(async (req, res) => {
  try {
    let bio = await Bio.find({})
    res.status(200).json({
      status: "success",
      bio
    });
  } catch (err) {
    console.log("BIO FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});