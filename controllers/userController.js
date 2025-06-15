import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import ExcelJS from "exceljs";
import mongoose from "mongoose";

// Helper function to get initials from LGA name
const getLGAInitials = (lga) => {
  return lga
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

// Helper function to pad number with leading zeros
const padNumber = (num, size) => {
  return num.toString().padStart(size, "0");
};

export const createUser = catchAsync(async (req, res, next) => {
  try {
    // Start a session for atomic operations

    const { email, phoneNumber, idNumber } = req.body;

    const existingPhoneNumber = await User.findOne({
      phoneNumber,
    });
    // if(email?.trim()?.length > 0) {
    //   const existingEmail = await User.findOne({ email: email.toLowerCase() });
    //   if (existingEmail) {
    //     res.status(400).json({
    //       status: "fail",
    //       message: "Email already exists. Please use another",
    //     });
    //   }
    // }
    const existingIdNumber = await User.findOne({ idNumber });

    if (existingPhoneNumber) {
      res.status(400).json({
        status: "fail",
        message: "Phone number already exists. Please use another",
      });
      return    }
    if (existingIdNumber) {
      res.status(400).json({
        status: "fail",
        message: "Id number already exists. Please use another",
      });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the current year's last two digits
const currentYear = new Date().getFullYear() % 100;

// Get LGA initials
const lgaInitials = getLGAInitials(req.body.lga);

// Find the last user with same year AND same LGA to determine next serial number
const lastUser = await User.find({
  userId: new RegExp(`ISM/B5-${currentYear}/${lgaInitials}/\\d+$`)
})
  .sort({ "userId": -1 })
  .limit(1)
  .session(session);

// Calculate next serial number
let serialNumber = 1;

if (lastUser && lastUser.length > 0 && lastUser[0].userId) {
  const lastSerialStr = lastUser[0].userId.split("/").pop();
  serialNumber = parseInt(lastSerialStr) + 1;
}

// Generate the unique ID
const userId = `ISM/B5-${currentYear}/${lgaInitials}/${padNumber(
  serialNumber,
  4
)}`;
      // Add userId to request body
      const userData = {
        ...req.body,
        userId,
      };

      // Create new user
      const newUser = await User.create([userData], { session });

      // Commit the transaction
      await session.commitTransaction();

      res.status(200).json({
        status: "success",
        user: newUser[0],
        message: "User created successfully",
      });
    } catch (error) {
      // Rollback the transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    console.log("USER CREATE ERROR ----> ", error);
    res.status(400).json({
      error: error.message,
    });
  }
});

export const updateUser = catchAsync(async (req, res) => {
  if (req.body.email) {
    const existingUser = await User.findOne({
      email: req.body.email,
      _id: { $ne: req.params.id },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "Email is already in use by another user",
      });
    }
  }
  if (req.body.phoneNumber) {
    const existingUser = await User.findOne({
      phoneNumber: req.body.phoneNumber,
      _id: { $ne: req.params.id },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "Phone number is already in use by another user",
      });
    }
  }

  if (req.body.idNumber) {
    const existingUser = await User.findOne({
      idNumber: req.body.idNumber,
      _id: { $ne: req.params.id },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "Phone number is already in use by another user",
      });
    }
  }

  const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "User updated successfully",
    data: updated,
  });
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

export const getUserByParams = catchAsync(async (req, res) => {
  try {
    const searchTerm = req.query.searchTerm;

    if (!searchTerm) {
      return res.status(400).json({
        message: "Please provide a search term (email, phone number or userId)",
      });
    }

    // Search for user with either email or phone number
    const user = await User.findOne({
      $or: [
        { email: searchTerm },
        { phoneNumber: searchTerm },
        { userId: searchTerm },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "No user found with this user id, email or phone number",
      });
    }

    res.status(200).json(user);
  } catch (err) {
    console.log("USER FETCH ERROR ----> ", err);
    res.status(400).json({
      error: err.message,
    });
  }
});

// export const getUsers = catchAsync(async (req, res) => {
//   try {
//     let events = await User.find({})
//     res.status(200).json(
//       [...events]
//     );
//   } catch (err) {
//     console.log("EVENT FETCH ERROR ----> ", err);
//     res.status(400).json({
//       err: err.message,
//     });
//   }
// });

// const ITEMS_PER_PAGE = 20;

// export const getUsers = catchAsync(async (req, res) => {
//   try {
//     const { searchTerm, searchType, page = 1 } = req.query;
//     let query = {};

//     if (searchTerm && searchType) {
//       query[searchType] = {
//         $regex: searchTerm,
//         $options: 'i'
//       };
//     }

//     // Calculate skip value for pagination
//     const skip = (parseInt(page) - 1) * ITEMS_PER_PAGE;

//     // Get total count for pagination
//     const totalUsers = await User.countDocuments(query);

//     // Get paginated results
//     const users = await User.find(query)
//       .skip(skip)
//       .limit(ITEMS_PER_PAGE)
//       .sort({ createdAt: -1 }); // Optional: sort by creation date

//     res.status(200).json({
//       users,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(totalUsers / ITEMS_PER_PAGE),
//         totalItems: totalUsers,
//         itemsPerPage: ITEMS_PER_PAGE
//       }
//     });
//   } catch (err) {
//     console.log("USER FETCH ERROR ----> ", err);
//     res.status(400).json({
//       err: err.message,
//     });
//   }
// });

const ITEMS_PER_PAGE = 20;
const buildQuery = (params) => {
  const {
    searchTerm,
    searchType,
    disability,
    sex,
    state,
    lga,
    community,
    religion,
    physicalFitness,
  } = params;

  const query = {};

  // Use $and for better index utilization
  const conditions = [];

  // Add search condition if present
  if (searchTerm && searchType) {
    conditions.push({
      [searchType]: {
        $regex: searchTerm,
        $options: "i",
      },
    });
  }

  // Add filter conditions
  if (disability) conditions.push({ disability });
  if (sex) conditions.push({ sex });
  if (state) conditions.push({ state });
  if (lga) conditions.push({ lga });
  if (community) conditions.push({ community });
  if (religion) conditions.push({ religion });
  if (physicalFitness) conditions.push({ physicalFitness });

  if (conditions.length > 0) {
    query.$and = conditions;
  }

  return query;
};

export const getUsers = catchAsync(async (req, res) => {
  console.log("request!");

  try {
    const {
      searchTerm,
      searchType,
      page = 1,
      disability,
      sex,
      state,
      lga,
      community,
      religion,
      physicalFitness,
      sortBy = "_id",
      sortOrder = "asc",
    } = req.query;

    // Build dynamic query object
    let query = {};

    // Add search term if provided
    if (searchTerm && searchType) {
      query[searchType] = {
        $regex: searchTerm,
        $options: "i",
      };
    }

    console.log("is this the place", query);

    // Add filters
    const filterFields = [
      "disability",
      "sex",
      "state",
      "lga",
      "community",
      "religion",
      "physicalFitness",
      "operator"
    ];

    filterFields.forEach((field) => {
      if (req.query[field]) {
        // Trim whitespace and create case-insensitive regex
        const cleanValue = req.query[field?.toLowerCase()].trim();
        query[field?.toLowerCase()] = {
          $regex: new RegExp(`^\\s*${cleanValue}\\s*$`, "i"),
        };
      }
    });

    // Validate sortBy to prevent injection
    const validSortFields = [
      "_id",
      "userId",
      "names",
      "email",
      "phoneNumber",
      "age",
      "sex",
      "state",
      "community",
      "disability",
    ];

    const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : "_id";
    const sanitizedSortOrder = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * ITEMS_PER_PAGE;

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    console.log("query for users API", query);

    // Get paginated and sorted results
    const users = await User.find(query)
      .sort({ [sanitizedSortBy]: sanitizedSortOrder })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.status(200).json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / ITEMS_PER_PAGE),
        totalItems: totalUsers,
        itemsPerPage: ITEMS_PER_PAGE,
      },
    });
  } catch (err) {
    console.log("USER FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getUsersNumbers = catchAsync(async (req, res) => {
  try {
    const {
      searchTerm,
      searchType,
      page = 1,
      disability,
      sex,
      state,
      lga,
      community,
      religion,
      physicalFitness,
      sortBy = "_id",
      sortOrder = "asc",
      // Add new date range parameters
      startDate,
      endDate,
    } = req.query;

    console.log("req.query;", req.query);
    

    // Base query to ensure qrCodeUrl exists and is not null
    let query = {
      qrCodeUrl: { $exists: true, $ne: null },
    };

    console.log("yoo",{
      startDate,endDate
    });
    
    
    // Add date range filter if both dates are provided
    if (startDate && endDate) {
      // Assuming you have an updatedAt field in your User model
      query.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Add additional filters
    const filterFields = ["lga", "state"];

    console.log("req.query", req.query);

    filterFields.forEach((field) => {
      if (req.query[field]) {
        // Trim whitespace and create case-insensitive regex
        const cleanValue = req.query[field?.toLowerCase()].trim();
        query[field?.toLowerCase()] = {
          $regex: new RegExp(`^\\s*${cleanValue}\\s*$`, "i"),
        };
      }
    });

    // Validate sortBy to prevent injection
    const validSortFields = [
      "_id",
      "userId",
      "names",
      "email",
      "phoneNumber",
      "age",
      "sex",
      "state",
      "community",
      "disability",
      "updatedAt", // Add updatedAt to valid sort fields
    ];

    const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : "_id";
    const sanitizedSortOrder = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * ITEMS_PER_PAGE;

    console.log("query getUsersNumbers", query);

    // Count filtered users with qrCodeUrl plus any additional filters
    const filteredUsers = await User.countDocuments(query);

    // Get paginated and sorted results
    const users = await User.find(query)
      .sort({ [sanitizedSortBy]: sanitizedSortOrder })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    res.status(200).json({
      users,
      filteredUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredUsers / ITEMS_PER_PAGE),
        totalItems: filteredUsers,
        itemsPerPage: ITEMS_PER_PAGE,
      },
    });
  } catch (err) {
    console.log("USER FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const deleteUser = catchAsync(async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (err) {
    console.log("EVENT DELETE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const recordMeal = async (req, res) => {
  try {
    const { userId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentHour = new Date().getHours();
    let mealType;

    // Determine meal type based on time of day
    if (currentHour >= 3 && currentHour < 11) {
      mealType = 'breakfast';
    } else if (currentHour >= 11 && currentHour < 16) {
      mealType = 'lunch';
    } else if (currentHour >= 16 && currentHour < 23.5) {
      mealType = 'dinner';
    } else {
      return res.status(400).json({ message: "Not within meal service hours" });
    }


    // Find user and update or create meal record

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("today.toDateString()", today.toDateString());

    // Find or create today's meal record
    let todayRecord = user.mealRecords.find(
      (record) => record.date.toDateString() === today.toDateString()
    );

    // Check if meal already recorded
    if (!!todayRecord && todayRecord[mealType] === true) {
      return res.status(400).json({
        success: false,
        message: `${
          mealType.charAt(0).toUpperCase() + mealType.slice(1)
        } has already been recorded for today`,
      });
    }

    if (!todayRecord) {
      // Create new record for today
      user.mealRecords.push({
        date: today,
        [mealType]: true,
      });
    } else {
      // Update existing record
      todayRecord[mealType] = true;
    }

    await user.save();

    return res.status(200).json({
      message: `${mealType} recorded successfully`,
      mealType,
      date: today,
    });
  } catch (error) {
    console.error("Error recording meal:", error);
    return res.status(500).json({
      success: false,
      message: "Error recording meal",
      error: error.message,
    });
  }
};

export const getDailyMealTotals = async (req, res) => {
  try {
    // Get today's date and set to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create tomorrow's date for comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Aggregate meals for all users
    const mealTotals = await User.aggregate([
      // Match records for today only
      {
        $match: {
          "mealRecords.date": {
            $gte: today,
            $lt: tomorrow,
          },
        },
      },
      // Unwind the mealRecords array to work with individual records
      { $unwind: "$mealRecords" },
      // Match today's records again after unwinding
      {
        $match: {
          "mealRecords.date": {
            $gte: today,
            $lt: tomorrow,
          },
        },
      },
      // Group and count meals by type
      {
        $group: {
          _id: null,
          breakfast: {
            $sum: {
              $cond: ["$mealRecords.breakfast", 1, 0],
            },
          },
          lunch: {
            $sum: {
              $cond: ["$mealRecords.lunch", 1, 0],
            },
          },
          dinner: {
            $sum: {
              $cond: ["$mealRecords.dinner", 1, 0],
            },
          },
          totalUsers: { $addToSet: "$_id" },
        },
      },
      // Format the output
      {
        $project: {
          _id: 0,
          date: today,
          breakfast: 1,
          lunch: 1,
          dinner: 1,
          totalUniqueUsers: { $size: "$totalUsers" },
        },
      },
    ]);

    // If no records found, return zeros
    if (mealTotals.length === 0) {
      return res.status(200).json({
        date: today,
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        totalUniqueUsers: 0,
      });
    }

    return res.status(200).json(mealTotals[0]);
  } catch (error) {
    console.error("Error getting meal totals:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving meal totals",
      error: error.message,
    });
  }
};

export const downloadUsersExcel = catchAsync(async (req, res) => {
  try {
    const {
      searchTerm,
      searchType,
      disability,
      sex,
      state,
      lga,
      community,
      religion,
      physicalFitness,
      registeredUsersOnly,
      startDate,
      endDate,
    } = req.query;

    console.log("registeredUsersOnly", registeredUsersOnly);

    // Build query object (reuse your existing query building logic)
let query;
    // if (registeredUsersOnly === "true") {
      query = {
        qrCodeUrl: { $exists: true, $ne: null },
      };
    // } else {
    //    query = {};
    // }

    // Add date range filter if both dates are provided
    if (startDate && endDate) {
      // Assuming you have an updatedAt field in your User model
      query.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (searchTerm && searchType) {
      query[searchType] = { $regex: searchTerm, $options: "i" };
    }

    const filterFields = [
      "disability",
      "sex",
      "state",
      "lga",
      "community",
      "religion",
      "physicalFitness",
    ];

    filterFields.forEach((field) => {
      if (req.query[field]) {
        // Trim whitespace and create case-insensitive regex
        const cleanValue = req.query[field?.toLowerCase()].trim();
        query[field?.toLowerCase()] = {
          $regex: new RegExp(`^\\s*${cleanValue}\\s*$`, "i"),
        };
      }
    });

    // Get all matching users without pagination
    const users = await User.find(query).lean(); // .lean() for better performance

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // Define columns
    worksheet.columns = [
      { header: "User ID", key: "userId", width: 15 },
      { header: "Name", key: "names", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phoneNumber", width: 15 },
      { header: "Age", key: "age", width: 10 },
      { header: "Gender", key: "sex", width: 10 },
      { header: "State", key: "state", width: 15 },
      { header: "Lga", key: "lga", width: 20 },
      { header: "Community", key: "community", width: 20 },
      { header: "Limited", key: "limited", width: 50 },
      { header: "Religion", key: "religion", width: 15 },
      { header: "Disability", key: "disability", width: 10 },
      { header: "Physical Fitness", key: "physicalFitness", width: 15 },
      { header: "Operator", key: "operator", width: 15 },
      { header: "District", key: "district", width: 20 },
      { header: "MSP Type", key: "mspType", width: 20 },
      { header: "Qualifications", key: "qualification", width: 20 },
      { header: "Languages Spoken And Written", key: "languagesSpokenAndWritten", width: 20 },
      { header: "ID Type", key: "idType", width: 20 },
      { header: "ID Number", key: "idNumber", width: 20 },
      { header: "Availability", key: "availability", width: 20 },
      { header: "Pre Existing Health Condition", key: "preExistingHealthCondition", width: 20 },
      { header: "Nursing Mother", key: "nursingMother", width: 20 },
      { header: "birth certificate", key: "birthCertificateCheck", width: 50 },
      { header: "Photo", key: "photo", width: 50 },
    ];

    // Add rows
    users.forEach((user) => {
      worksheet.addRow({
        userId: user.userId,
        names: user.names,
        email: user.email,
        phoneNumber: user.phoneNumber,
        age: user.age,
        sex: user.sex,
        state: user.state,
        lga: user.lga,
        community: user.community,
        limited: user.limited,
        religion: user.religion,
        disability: user.disability,
        physicalFitness: user.physicalFitness,
        operator: user.operator,
        district: user.district,
        mspType: user.mspType,
        qualification: user.qualification,
        languagesSpokenAndWritten: user.languagesSpokenAndWritten,
        idType: user.idType,
        idNumber: user.idNumber,
        availability: user.availability,
        preExistingHealthCondition: user.preExistingHealthCondition,
        nursingMother: user.nursingMother,
        birthCertificateCheck: user.birthCertificateCheck,
        photo: user.photo
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(400).json({
      error: err.message,
    });
  }
});

export const recordHealthAppointment = async (req, res) => {
  try {
    const { userId } = req.params;
    const appointmentData = req.body;
    console.log("userId", userId);
    console.log("appointmentData", appointmentData);
    

    
    


    // Find user and update or create meal record

    const user = await User.findOne({ _id: userId });


    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    

  
      // Create new record for today
      user.appointments.push({
        ...appointmentData
      });
   

    await user.save();

    

    return res.status(200).json({
      message: `appointment recorded successfully`
    });
  } catch (error) {
    console.error("Error recording appointment", error);
    return res.status(500).json({
      success: false,
      message: "Error recording meal",
      error: error.message,
    });
  }
};

export const recordAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);



    // Find user and update or create attendance record

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("today.toDateString()", today.toDateString());

    // Find or create today's attendance record
    let todayRecord = user.attendance.find(
      (record) => record.date.toDateString() === today.toDateString() && record?.subject === subject
    );

    console.log("todayRecord", todayRecord);
    console.log("req.body", req.body);
    console.log("subject", subject);
    console.log("todayRecord[subject] === true", todayRecord?.subject, todayRecord?.subject === subject);
    

    // Check if attendance already recorded
    if (!!todayRecord) {
      return res.status(400).json({
        success: false,
        message: `${subject} attendance has already been taken for today`,
      });
    }else {
      // Create new record for today
      user.attendance.push({
        date: today,
      ...req.body
      });
    }

  
    await user.save();

    return res.status(200).json({
      message: `attendance recorded successfully`,
      ...req?.body,
      date: today,
    });
  } catch (error) {
    console.error("Error recording attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Error recording attendance",
      error: error.message,
    });
  }
};

export const checkInTab = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if user's latest record is a check-in (meaning they haven't checked out yet)
    const latestRecord = user.tabChecking?.length > 0 
      ? user.tabChecking[user.tabChecking.length - 1] 
      : null;

    if (latestRecord && latestRecord.checkType === "check-in") {
      return res.status(400).json({
        success: false,
        message: "User already has a tablet checked in. Please check out first.",
      });
    }

    // Create check-in record
    const checkInRecord = {
      checkType: "check-in",
      timeStamp: new Date(),
    };

    // Initialize tabChecking array if it doesn't exist
    if (!user.tabChecking) {
      user.tabChecking = [];
    }

    user.tabChecking.push(checkInRecord);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Tablet checked in successfully",
      data: checkInRecord
    });

  } catch (error) {
    console.error("Error checking in tablet:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking in tablet",
      error: error.message,
    });
  }
};

export const checkOutTab = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if user's latest record is a check-in (meaning they can check out)
    const latestRecord = user.tabChecking?.length > 0 
      ? user.tabChecking[user.tabChecking.length - 1] 
      : null;

    if (!latestRecord || latestRecord.checkType !== "check-in") {
      return res.status(400).json({
        success: false,
        message: "No active tablet check-in found. Cannot check out.",
      });
    }

    // Create check-out record
    const checkOutRecord = {
      checkType: "check-out",
      timeStamp: new Date(),
    };

    user.tabChecking.push(checkOutRecord);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Tablet checked out successfully",
      data: checkOutRecord
    });

  } catch (error) {
    console.error("Error checking out tablet:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking out tablet",
      error: error.message,
    });
  }
};

// Helper function to get current tablet status
export const getTabletStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const tabChecking = user.tabChecking || [];
    
    // Get the most recent record
    const latestRecord = tabChecking.length > 0 
      ? tabChecking[tabChecking.length - 1] 
      : null;

    if (!latestRecord) {
      return res.status(200).json({
        success: true,
        status: "no-tablet",
        message: "No tablet assigned to this user"
      });
    }

    if (latestRecord.checkType === "check-in") {
      return res.status(200).json({
        success: true,
        status: "checked-in",
        message: "Tablet is currently assigned to user",
        lastCheckIn: latestRecord
      });
    } else {
      return res.status(200).json({
        success: true,
        status: "checked-out",
        message: "Tablet has been returned",
        lastCheckOut: latestRecord
      });
    }

  } catch (error) {
    console.error("Error getting tablet status:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting tablet status",
      error: error.message,
    });
  }
};