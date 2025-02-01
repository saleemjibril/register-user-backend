import mongoose from "mongoose";

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
      unique: true,
      sparse: true, 
      lowercase: true,
    },
    community: {
      type: String,
      required: [true, "Please provide your community"],
      lowercase: true,
    },
    limited: {
      type: String,
      required: [true, "Please provide your community"],
      lowercase: true,
    },
    district: {
      type: String,
      required: [true, "Please provide your district"],
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;