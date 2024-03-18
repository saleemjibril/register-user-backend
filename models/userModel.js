import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide your username'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password should have at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: [
        'admin',
        'super-admin',
      ],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
)

// Hash Password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  this.password = await bcrypt.hash(this.password, 12)

  next()
})

// Store date password changed
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next()

  this.passwordChangedAt = Date.now() - 1000
  next()
})


userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } })
  next()
})

// Compare passwords
userSchema.methods.comparePassword = async function (
  otherPassword,
  userPassword
) {
  return await bcrypt.compare(otherPassword, userPassword)
}

/*
Check if Password has been changed after successful login. 
returns true or false
*/
userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    )
    return JWTTimestamp < changedTimestamp
  }
  return false
}

// Create password reset token
userSchema.methods.createToken = function (tokenType) {
  const token = crypto.randomBytes(32).toString('hex')

  if (tokenType === 'activate') {
    this.userActivateToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
  } else if (tokenType === 'reset') {
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000
  }

  return token
}

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

// set last login date
userSchema.statics.login = function login(id, callback) {
  return this.findByIdAndUpdate(
    id,
    { $set: { lastLoginDate: Date.now() } },
    { new: true },
    callback
  )
}

const User = mongoose.model('User', userSchema)

export default User;
