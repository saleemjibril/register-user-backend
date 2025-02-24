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
}
);


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
      lowercase: true,
    },
    email: {
      type: String,
      lowercase: true,
    },
    community: {
      type: String,
      required: [true, "Please provide your community"],
      lowercase: true,
      
    },
    limited: {
      type: String,
      lowercase: true,
    },
    district: {
      type: String,
      lowercase: true,
    },
    state: {
      type: String,
      required: [true, "Please provide your state"],
      lowercase: true,
    },
    mspType: {
      type: String,
      required: [true, "Please provide your mspType"],
      lowercase: true,
    },
    lga: {
      type: String,
      required: [true, "Please provide your lga"],
      lowercase: true,
    },
    state: {
      type: String,
      required: [true, "Please provide your state"],
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide your phone number"],
      unique: true,
      sparse: true,
    },
    age: {
      type: String,
      required: [true, "Please provide your age"],
      lowercase: true,
    },
    sex: {
      type: String,
      required: [true, "Please provide your gender"],
      lowercase: true,
    },
    degreeQualifications: {
      type: String,
      lowercase: true,
    },
    helperColumnMale: {
      type: String,
      lowercase: true,
    },
    helperColumnFemale: {
      type: String,
      lowercase: true,
    },
    languagesSpokenAndWritten: {
      type: String,
      required: [true, "Please provide your language written and spoken"],
      lowercase: true,
    },
    disability: {
      type: String,
      lowercase: true,
      default: "no"
    },
    religion: {
      type: String,
      lowercase: true,
    },
    helperColumnChristianity: {
      type: String,
      lowercase: true,
    },
    helperColumnIslam: {
      type: String,
      lowercase: true,
    },
    birthCertificateCheck: {
      type: String,
      lowercase: true,
      default: "no"
    },
    idType: {
      type: String,
      required: [true, "Please provide your Id type"],
      lowercase: true,
    },
    idNumber: {
      type: String,
      required: [true, "Please provide your Id number"],
      unique: true,
      sparse: true,
    },
    qualification: {
      type: String,
      lowercase: true,
    },
    physicalFitness: {
      type: String,
      required: [true, "Please indicate your physical fitness"],
      lowercase: true,
    },
    availability: {
      type: String,
      required: [true, "Please provide your availability"],
      lowercase: true,
    },
    preExistingHealthCondition: {
      type: String,
      required: [true, "Please indicate if you have pre existing health conditions"],
      lowercase: true,
    },
    nursingMother: {
      type: String,
      lowercase: true,
      default: "no"
    },
    remark: {
      type: String,
      lowercase: true,
    },
    photo: {
      type: String,
    },
    credentials: {
      type: Object,
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
    operator: {
      type: String,
      lowercase: true,
      default: "no"
    },
    mealRecords: [mealRecordSchema],
    appointments: [appointmentRecordSchema]
  },
  {
    timestamps: true,
  }
);

// Add to userModel.js
userSchema.index({ userId: 1 });
userSchema.index({ names: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ age: 1 });
userSchema.index({ sex: 1 });
userSchema.index({ state: 1 });
userSchema.index({ disability: 1 });
userSchema.index({ "mealRecords.date": 1 });

const User = mongoose.model("User", userSchema);

export default User;