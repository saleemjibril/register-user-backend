import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide game title"],
  },  
  creator: {
    type: String,
    required: [true, "Provide game creator"],
  },  
  categories: {
    type: Array,
    required: [true, "Provide event category"],
  },
  link: {
    type: String,
    required: [true, "Provide game link"],
  },
  image: {
    type: Object,
    required: [true, "Provide game image"],
  },
  videos: {
    type: Array,
    required: [true, "Provide game videos"],
  }
},
{
    timestamps: true,
  }
);

const Game = mongoose.model('Game', gameSchema)

export default Game;
