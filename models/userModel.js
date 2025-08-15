import mongoose from "mongoose";

const mealRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  breakfast: {
    type: Boolean,
    default: false
  },
  lunch: {
    type: Boolean,
    default: false
  },
  dinner: {
    type: Boolean,
    default: false
  }
});

const appointmentRecordSchema = new mongoose.Schema({
  complaint: {
    type: String,
  },
  diagnosis: {
    type: String,
  },
  prescriptions: {
    type: Array,
  }
},
{
  timestamps: true,
});

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      required: [true, "userId missing"],
      sparse: true
    },
    names: {
      type: String,
      required: [true, "Please provide your name"],
    },
    age: {
      type: String,
      required: [true, "Please provide your age"],
    },
    sex: {
      type: String,
      required: [true, "Please provide your gender"],
    },
    gradeLevel: {
      type: String,
      required: [true, "Please provide your grade level"],
    },
    disability: {
      type: String,
      default: "no"
    },
    disabilityType: {
      type: String,
    },
    consent: {
      type: String,
    },
    helperColumnMale: {
      type: String,
    },
    helperColumnFemale: {
      type: String,
    },
    photo: {
      type: String,
    },
    leftFingerPrint: {
      type: String,
    },
    rightFingerPrint: {
      type: String,
    },
    qrCodeUrl: {
      type: String,
    },
    attendance: {
      type: Array
    },
    mealRecords: [mealRecordSchema],
    appointments: [appointmentRecordSchema]
  },
  {
    timestamps: true,
  }
);

// Basic indexes for the simplified schema
userSchema.index({ names: 1 });
userSchema.index({ age: 1 });
userSchema.index({ sex: 1 });
userSchema.index({ disability: 1 });

// Text index for search functionality
userSchema.index({ 
  names: "text"
});

// Compound indexes
userSchema.index({ sex: 1, disability: 1 });
userSchema.index({ age: 1, names: 1 });

// Timestamps indexes
userSchema.index({ createdAt: -1 });
userSchema.index({ updatedAt: -1 });

// Indexes for nested arrays
userSchema.index({ "mealRecords.date": 1 });
userSchema.index({ "appointments.createdAt": -1 });

const User = mongoose.model("User", userSchema);

export default User;