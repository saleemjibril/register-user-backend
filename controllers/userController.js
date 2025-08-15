import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import ExcelJS from "exceljs";
import mongoose from "mongoose";

// Helper function to get initials from LGA name
const getInitials = (lga) => {
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



    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the current year's last two digits
const currentYear = new Date().getFullYear() % 100;

// Get  initials
const initials = getInitials(req.body.names);

// Find the last user with same year AND same name to determine next serial number
const lastUser = await User.find({
  userId: new RegExp(`CH/B1-${currentYear}/${initials}/\\d+$`)
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
const userId = `CH/B1-${currentYear}/${initials}/${padNumber(
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
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate user ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: "Invalid user ID",
        message: "Please provide a valid user ID",
      });
    }

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
        message: "No user found with the provided ID",
      });
    }

    // Define fields that are not allowed to be updated
    const protectedFields = ['_id', '__v', 'createdAt'];
    const sanitizedUpdateData = { ...updateData };
    
    // Remove protected fields
    protectedFields.forEach(field => {
      delete sanitizedUpdateData[field];
    });

    // Set updatedAt timestamp
    sanitizedUpdateData.updatedAt = new Date();

    // Validate unique fields concurrently for better performance
    const uniqueFieldChecks = [];


    if (sanitizedUpdateData.userId && sanitizedUpdateData.userId !== existingUser.userId) {
      uniqueFieldChecks.push({
        field: 'userId',
        value: sanitizedUpdateData.userId.trim(),
        query: { 
          userId: sanitizedUpdateData.userId.trim(),
          _id: { $ne: id }
        }
      });
    }

    // Check for unique field conflicts
    if (uniqueFieldChecks.length > 0) {
      const conflictChecks = await Promise.all(
        uniqueFieldChecks.map(async (check) => {
          const conflictUser = await User.findOne(check.query);
          return {
            field: check.field,
            hasConflict: !!conflictUser,
            conflictUserId: conflictUser?.userId || null
          };
        })
      );

      const conflicts = conflictChecks.filter(check => check.hasConflict);
      
      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(conflict => {
          const fieldNames = {
            userId: 'User ID'
          };
          return `${fieldNames[conflict.field]} is already in use by another user`;
        });

        return res.status(409).json({
          error: "Duplicate field values",
          message: conflictMessages.join('. '),
          conflicts: conflicts.map(c => ({
            field: c.field,
            conflictUserId: c.conflictUserId
          }))
        });
      }
    }





    // Sanitize text fields
    const textFields = ['names', 'state', 'lga', 'community', 'religion', 'operator', 'district'];
    textFields.forEach(field => {
      if (sanitizedUpdateData[field]) {
        sanitizedUpdateData[field] = sanitizedUpdateData[field].trim();
      }
    });

    // Validate age if provided
    if (sanitizedUpdateData.age !== undefined) {
      const age = parseInt(sanitizedUpdateData.age);
      if (isNaN(age) || age < 0 || age > 150) {
        return res.status(400).json({
          error: "Invalid age",
          message: "Age must be a number between 0 and 150",
        });
      }
      sanitizedUpdateData.age = age;
    }

    // Use findByIdAndUpdate with proper options
    const updatedUser = await User.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      {
        new: true,
        runValidators: true,
        context: 'query' // Important for mongoose validators
      }
    );

    // Use aggregation to get formatted response data
    const [userResponse] = await User.aggregate([
      { $match: { _id: updatedUser._id } },
      {
        $project: {
          userId: 1, names: 1, gradeLevel: 1, disabilityType: 1, age: 1,
          sex: 1, disability: 1, consent: 1,
          religion: 1, physicalFitness: 1, operator: 1, photo: 1,
          createdAt: 1, updatedAt: 1,
        }
      }
    ]);

    // Prepare response with metadata
    const response = {
      user: userResponse,
      metadata: {
        userId: userResponse.userId,
        lastUpdated: userResponse.updatedAt,
        fieldsUpdated: Object.keys(sanitizedUpdateData).filter(key => key !== 'updatedAt'),
        hasQRCode: !!userResponse.qrCodeUrl
      }
    };

    res.status(200).json({
      message: "User updated successfully",
      data: response
    });

  } catch (err) {
    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));

      return res.status(400).json({
        error: "Validation failed",
        message: "One or more fields failed validation",
        validationErrors
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({
        error: "Invalid data format",
        message: "One or more fields have invalid format",
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        error: "Duplicate value",
        message: `${field} already exists in the system`,
      });
    }

    // General error response
    res.status(500).json({
      error: "Failed to update user",
      message: err.message,
    });
  }
});

export const getUser = catchAsync(async (req, res) => {
  console.log("got called");
  
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
    const {
      searchTerm,
      includeFullProfile = false,
      includeQRCodeOnly = false,
    } = req.query;

    // Validate input
    if (!searchTerm) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: "Please provide a search term (email, phone number, or userId)",
      });
    }

    // Sanitize search term
    const sanitizedSearchTerm = searchTerm.toString().trim();
    
    if (sanitizedSearchTerm.length === 0) {
      return res.status(400).json({
        error: "Invalid search term",
        message: "Search term cannot be empty",
      });
    }

    // Build query with case-insensitive search
    let query = {
      $or: [
        // { email: { $regex: `^${sanitizedSearchTerm}$`, $options: "i" } },
        // { phoneNumber: sanitizedSearchTerm },
        { userId: sanitizedSearchTerm },
      ],
    };

    // Add QR code filter if requested
    if (includeQRCodeOnly === "true") {
      query.qrCodeUrl = { $exists: true, $ne: null };
    }

    // Use aggregation for consistent data handling
    const results = await User.aggregate([
      { $match: query },
      {
        $project: {
          userId: 1, names: 1, gradeLevel: 1, disabilityType: 1, age: 1,
                sex: 1, disability: 1, consent: 1, qrCodeUrl: 1,
                religion: 1, physicalFitness: 1, operator: 1, photo: 1,
                createdAt: 1, updatedAt: 1,
        }
        
      },
      { $limit: 1 } // Ensure we only get one result
    ]);

    const user = results[0];

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "No user found with the provided email, phone number, or user ID",
        searchTerm: sanitizedSearchTerm,
      });
    }

    // Prepare response with metadata
    const response = {
      user,
      metadata: {
        searchTerm: sanitizedSearchTerm,
        fullProfile: includeFullProfile === "true",
        hasQRCode: !!user.qrCodeUrl,
        lastUpdated: user.updatedAt,
      }
    };

    // Add search method used for debugging/analytics
    if (user.email && user.email.toLowerCase() === sanitizedSearchTerm.toLowerCase()) {
      response.metadata.searchMethod = "email";
    } else if (user.phoneNumber === sanitizedSearchTerm) {
      response.metadata.searchMethod = "phone";
    } else if (user.userId === sanitizedSearchTerm) {
      response.metadata.searchMethod = "userId";
    }

    // res.status(200).json(response);
    res.status(200).json(user);

  } catch (err) {
    // Handle specific MongoDB errors
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: "Invalid search parameter format",
        message: "The provided search term format is invalid",
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation error",
        message: err.message,
      });
    }

    // General error response
    res.status(500).json({
      error: "Failed to fetch user",
      message: err.message,
    });
  }
});




const ITEMS_PER_PAGE = 20;

export const getUsers = catchAsync(async (req, res) => {
  try {
    const {
      searchTerm,
      searchType,
      page = 1,
      disability,
      sex,
      religion,
      physicalFitness,
      operator,
      sortBy = "_id",
      sortOrder = "asc",
    } = req.query;

    // Validate and sanitize inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skipCount = (pageNum - 1) * ITEMS_PER_PAGE;

    const validSortFields = [
      "_id", "userId", "names", "gradeLevel", "disabilityType", 
      "age", "sex", "disability", "createdAt", "updatedAt"
    ];

    const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : "_id";
    const sanitizedSortOrder = sortOrder === "desc" ? -1 : 1;

    // Build query
    let query = {};
    let useTextSearch = false;

    if (searchTerm && searchType) {
      if (['names', 'gradeLevel', 'disabilityType', 'userId'].includes(searchType)) {
        query.$text = { $search: searchTerm };
        useTextSearch = true;
      } else {
        query[searchType] = { $regex: searchTerm, $options: "i" };
      }
    }

    // Add filters with direct matching
    const filterFields = ["disability", "sex", "religion", "physicalFitness", "operator"];
    
    filterFields.forEach((field) => {
      const value = req.query[field];
      if (value) {
        query[field] = value.toLowerCase().trim();
      }
    });

    // Use aggregation for optimal performance
    const results = await User.aggregate([
      { $match: query },
      {
        $facet: {
          users: [
            ...(useTextSearch ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
            { 
              $sort: useTextSearch && sortBy === 'relevance' 
                ? { score: { $meta: "textScore" } }
                : { [sanitizedSortBy]: sanitizedSortOrder }
            },
            { $skip: skipCount },
            { $limit: ITEMS_PER_PAGE },
            {
              $project: {
                userId: 1, names: 1, gradeLevel: 1, disabilityType: 1, age: 1,
                sex: 1, disability: 1, photo: 1,
                createdAt: 1, updatedAt: 1,
                ...(useTextSearch ? { score: 1 } : {})
              }
            }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ]);

    const users = results[0].users || [];
    const totalUsers = results[0].totalCount[0]?.count || 0;

    res.status(200).json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / ITEMS_PER_PAGE),
        totalItems: totalUsers,
        itemsPerPage: ITEMS_PER_PAGE,
      },
      ...(useTextSearch ? { searchMetadata: { textSearchUsed: true, searchTerm } } : {})
    });

  } catch (err) {
    res.status(400).json({
      error: "Failed to fetch users",
      message: err.message,
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
      operator,
      sortBy = "_id",
      sortOrder = "asc",
      startDate,
      endDate,
    } = req.query;

    // Validate and sanitize inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skipCount = (pageNum - 1) * ITEMS_PER_PAGE;

    const validSortFields = [
      "_id", "userId", "names", "gradeLevel", "disabilityType", 
      "age", "sex", "disability", "createdAt", "updatedAt"
    ];

    const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : "_id";
    const sanitizedSortOrder = sortOrder === "desc" ? -1 : 1;

    // Build base query - users with QR codes
    let query = {
      qrCodeUrl: { $exists: true, $ne: null },
    };
    let useTextSearch = false;

    // Add search functionality
    if (searchTerm && searchType) {
      if (['names', 'userId'].includes(searchType)) {
        query.$text = { $search: searchTerm };
        useTextSearch = true;
      } else if (validSortFields.includes(searchType)) {
        query[searchType] = { $regex: searchTerm, $options: "i" };
      }
    }

    // Add date range filter with proper validation
    // if (startDate && endDate) {
    //   const start = new Date(startDate);
    //   const end = new Date(endDate);
      
    //   if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    //     // Set end date to end of day for inclusive range
    //     end.setHours(23, 59, 59, 999);
        
    //     query.updatedAt = {
    //       $gte: start,
    //       $lte: end
    //     };
    //   }
    // }

    // Add filters with proper sanitization
    const filterFields = ["disability", "sex"];
    
    filterFields.forEach((field) => {
      const value = req.query[field];
      if (value) {
        query[field] = value.toLowerCase().trim();
      }
    });

    // Use aggregation for optimal performance
    const results = await User.aggregate([
      { $match: query },
      {
        $facet: {
          users: [
            ...(useTextSearch ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
            { 
              $sort: useTextSearch && sortBy === 'relevance' 
                ? { score: { $meta: "textScore" } }
                : { [sanitizedSortBy]: sanitizedSortOrder }
            },
            { $skip: skipCount },
            { $limit: ITEMS_PER_PAGE },
            {
              $project: {
                userId: 1, names: 1, gradeLevel: 1, disabilityType: 1, age: 1,
                sex: 1, disability: 1, photo: 1,
                createdAt: 1, updatedAt: 1,
                ...(useTextSearch ? { score: 1 } : {})
              }
            }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ]);

    const users = results[0].users || [];
    const totalUsers = results[0].totalCount[0]?.count || 0;

    res.status(200).json({
      users,
      filteredUsers: totalUsers, // Keep your existing field name for backward compatibility
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / ITEMS_PER_PAGE),
        totalItems: totalUsers,
        itemsPerPage: ITEMS_PER_PAGE,
      },
      ...(useTextSearch ? { searchMetadata: { textSearchUsed: true, searchTerm } } : {}),
      ...(startDate && endDate ? { 
        dateRange: { 
          startDate: new Date(startDate).toISOString(), 
          endDate: new Date(endDate).toISOString() 
        } 
      } : {})
    });

  } catch (err) {
    res.status(400).json({
      error: "Failed to fetch users with QR codes",
      message: err.message,
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

    // Save without running validation on the entire document
    await user.save({ validateBeforeSave: false });

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
  console.log("download");
  
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
      operator,
      registeredUsersOnly = "true",
      startDate,
      endDate,
      sortBy = "_id",
      sortOrder = "asc",
    } = req.query;

    // Validate sort parameters
    const validSortFields = [
      "_id", "userId", "names", "email", "phoneNumber", 
      "age", "sex", "state", "lga", "community", "disability", 
      "religion", "physicalFitness", "operator", "createdAt", "updatedAt"
    ];

    const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : "_id";
    const sanitizedSortOrder = sortOrder === "desc" ? -1 : 1;

    // Build base query
    let query = {};
    let useTextSearch = false;

    // Apply registered users filter
    if (registeredUsersOnly === "true") {
      query.qrCodeUrl = { $exists: true, $ne: null };
    }

    // Add search functionality
    if (searchTerm && searchType) {
      if (['names', 'email', 'phoneNumber', 'userId'].includes(searchType)) {
        query.$text = { $search: searchTerm };
        useTextSearch = true;
      } else if (validSortFields.includes(searchType)) {
        query[searchType] = { $regex: searchTerm, $options: "i" };
      }
    }

    // Add date range filter with proper validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Set end date to end of day for inclusive range
        end.setHours(23, 59, 59, 999);
        
        query.updatedAt = {
          $gte: start,
          $lte: end
        };
      }
    }

    // Add filters with proper sanitization
    const filterFields = ["disability", "sex", "state", "lga", "community", "religion", "physicalFitness", "operator"];
    
    filterFields.forEach((field) => {
      const value = req.query[field];
      if (value) {
        query[field] = value.toLowerCase().trim();
      }
    });

    // Use aggregation for consistent query handling and sorting
    const results = await User.aggregate([
      { $match: query },
      ...(useTextSearch ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
      { 
        $sort: useTextSearch && sortBy === 'relevance' 
          ? { score: { $meta: "textScore" } }
          : { [sanitizedSortBy]: sanitizedSortOrder }
      },
      {
        $project: {
          userId: 1, names: 1, email: 1, phoneNumber: 1, age: 1,
          sex: 1, state: 1, lga: 1, community: 1, disability: 1,
          religion: 1, physicalFitness: 1, operator: 1, photo: 1,
          limited: 1, district: 1, mspType: 1, qualification: 1,
          languagesSpokenAndWritten: 1, idType: 1, idNumber: 1,
          availability: 1, preExistingHealthCondition: 1, nursingMother: 1,
          birthCertificateCheck: 1
        }
      }
    ]);

    // console.log("the results", results);
    

    // Validate that we have users to export
    if (!results || results.length === 0) {
      return res.status(404).json({
        error: "No users found matching the specified criteria",
        message: "Please adjust your filters and try again"
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // Define columns with proper formatting
    worksheet.columns = [
      { header: "User ID", key: "userId", width: 15 },
      { header: "Name", key: "names", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phoneNumber", width: 15 },
      { header: "Age", key: "age", width: 10 },
      { header: "Gender", key: "sex", width: 10 },
      { header: "State", key: "state", width: 15 },
      { header: "LGA", key: "lga", width: 20 },
      { header: "Community", key: "community", width: 20 },
      { header: "Limited", key: "limited", width: 50 },
      { header: "Religion", key: "religion", width: 15 },
      { header: "Disability", key: "disability", width: 10 },
      { header: "Physical Fitness", key: "physicalFitness", width: 15 },
      { header: "Operator", key: "operator", width: 15 },
      { header: "District", key: "district", width: 20 },
      { header: "MSP Type", key: "mspType", width: 20 },
      { header: "Qualifications", key: "qualification", width: 30 },
      { header: "Languages Spoken And Written", key: "languagesSpokenAndWritten", width: 35 },
      { header: "ID Type", key: "idType", width: 20 },
      { header: "ID Number", key: "idNumber", width: 20 },
      { header: "Availability", key: "availability", width: 20 },
      { header: "Pre Existing Health Condition", key: "preExistingHealthCondition", width: 35 },
      { header: "Nursing Mother", key: "nursingMother", width: 20 },
      { header: "Birth Certificate", key: "birthCertificateCheck", width: 20 },
      { header: "Photo", key: "photo", width: 50 },
      // { header: "QR Code URL", key: "qrCodeUrl", width: 50 },
      // { header: "Created Date", key: "createdAt", width: 20 },
      // { header: "Updated Date", key: "updatedAt", width: 20 },
    ];

    // Add rows with proper data handling
    results.forEach((user) => {
      worksheet.addRow({
        userId: user.userId || '',
        names: user.names || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        age: user.age || '',
        sex: user.sex || '',
        state: user.state || '',
        lga: user.lga || '',
        community: user.community || '',
        limited: user.limited || '',
        religion: user.religion || '',
        disability: user.disability || '',
        physicalFitness: user.physicalFitness || '',
        operator: user.operator || '',
        district: user.district || '',
        mspType: user.mspType || '',
        qualification: Array.isArray(user.qualification) ? user.qualification.join(', ') : (user.qualification || ''),
        languagesSpokenAndWritten: Array.isArray(user.languagesSpokenAndWritten) ? user.languagesSpokenAndWritten.join(', ') : (user.languagesSpokenAndWritten || ''),
        idType: user.idType || '',
        idNumber: user.idNumber || '',
        availability: user.availability || '',
        preExistingHealthCondition: user.preExistingHealthCondition || '',
        nursingMother: user.nursingMother || '',
        birthCertificateCheck: user.birthCertificateCheck || '',
        photo: user.photo || '',
        // qrCodeUrl: user.qrCodeUrl || '',
        // createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        // updatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '',
      });
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.height = 20;

    // Auto-fit columns and add borders
    worksheet.columns.forEach((column, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      const columnCells = worksheet.getColumn(columnLetter);
      
      // Add borders to all cells
      columnCells.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate filename with timestamp and filters
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `users_export_${timestamp}`;
    
    if (registeredUsersOnly === "true") {
      filename += "_registered";
    }
    
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    }
    
    filename += '.xlsx';

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    console.log("workbook!", workbook);
    

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(400).json({
      error: "Failed to export users to Excel",
      message: err.message,
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