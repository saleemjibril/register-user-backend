import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createUser = catchAsync(async (req, res, next) => {

  try {
    const newUser = await User.create(req.body);
    console.log('newUser', newUser);
    

  res.status(200).json({
    status: "success",
    user: newUser,
    message:
      "User created successfully",
  });
  } catch (error) {
    console.log("EVENT UPDATE ERROR ----> ", error);
    res.status(400).json({
      error: error.message,
    });
  }
});

export const updateUser = catchAsync(async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message:
        "User updated successfully",
    });
  } catch (err) {
    console.log("EVENT UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});


export const getUser = catchAsync(async (req, res) => {
  try {
    const event = await User.findById(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    console.log("EVENT FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getUsers = catchAsync(async (req, res) => {
  try {
    let events = await User.find({})
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

export const deleteUser = catchAsync(async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(204).json({
      status: 'success',
      message:
      "User deleted successfully",
    })
  } catch (err) {
    console.log("EVENT DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
