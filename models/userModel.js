import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
      name: {
        type: String,
        required: [true, 'Please provide your name'],
        lowercase: true,
        unique: false 
      },
    photo: {
      type: String,
      required: [true, 'Please provide an image'],
    },
    qrCodeUrl: {
      type: String,

    }
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', userSchema)

export default User;
