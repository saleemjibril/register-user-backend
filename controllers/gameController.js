import Game from "../models/GameModel.js";
import catchAsync from "../utils/catchAsync.js";


export const createGame = catchAsync(async (req, res, next) => {

  const newGame = await Game.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Game created successfully",
  });
});

export const updateGame = catchAsync(async (req, res) => {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      message:
        "Game updated successfully",
    });
  } catch (err) {
    console.log("GAME UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});


export const getGame = catchAsync(async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    res.status(200).json(game);
  } catch (err) {
    console.log("GAME FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getAllGames = catchAsync(async (req, res) => {
  try {
    let games = await Game.find({})
    res.status(200).json([...games]);
  } catch (err) {
    console.log("GAME FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const deleteGame = catchAsync(async (req, res) => {
  try {
    const deleted = await Game.findByIdAndDelete(req.params.id)
  
    if (!deleted) {
      return next(new AppError('No document found with that ID', 404))
    }
  
  
  
    res.status(200).json({
      status: 'success',
      message:
      "Game deleted successfully",
    })
  } catch (err) {
    console.log("GAME DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
