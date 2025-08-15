
import mongoose from "mongoose";
import Inventory from "../models/inventoryModel.js";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/userModel.js";

// Helper function to generate Pad Batch ID
const generatePadBatchId = (brandType, supplierName) => {
  const currentYear = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  
  // Get brand initials (first 2-3 letters)
  const brandInitials = brandType.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  
  // Get supplier initials (first letter of each word)
  const supplierInitials = supplierName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3);
  
  // Generate random 3-digit number
  const randomNum = Math.floor(100 + Math.random() * 900);
  
  return `PAD/${currentYear}${month}${day}/${brandInitials}/${supplierInitials}/${randomNum}`;
};

export const createInventory = (async (req, res, next) => {
  try {
    // Start a session for atomic operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        brandType,
        quantitySupplied,
        supplierDonorName,
        dateReceived,
        storageLocation,
        staffInCharge,
        staffId,
        expiryDate,
        unitCost,
        notes,
        lowStockThreshold
      } = req.body;

      // Validate required fields
      if (!brandType || !quantitySupplied || !supplierDonorName || !dateReceived || !storageLocation || !staffInCharge || !staffId) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields"
        });
      }

      // Generate unique Pad Batch ID
      let padBatchId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        padBatchId = generatePadBatchId(brandType, supplierDonorName);
        
        // Check if this batch ID already exists
        const existingBatch = await Inventory.findOne({ padBatchId }).session(session);
        
        if (!existingBatch) {
          isUnique = true;
        } else {
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error("Unable to generate unique Pad Batch ID after multiple attempts");
      }

      // Prepare inventory data
      const inventoryData = {
        padBatchId,
        brandType,
        quantitySupplied: parseInt(quantitySupplied),
        currentStock: parseInt(quantitySupplied), // Initially, current stock equals supplied quantity
        supplierDonorName: supplierDonorName.trim(),
        dateReceived: new Date(dateReceived),
        storageLocation,
        staffInCharge: staffInCharge.trim(),
        staffId: staffId.trim(),
        status: "active",
        distributionRecords: [],
        stockAdjustments: []
      };

      // Add optional fields if provided
      if (expiryDate) {
        inventoryData.expiryDate = new Date(expiryDate);
        
        // Check if already expired
        if (new Date() > inventoryData.expiryDate) {
          inventoryData.status = "expired";
        }
      }

      if (unitCost && unitCost > 0) {
        inventoryData.unitCost = parseFloat(unitCost);
        inventoryData.totalValue = inventoryData.currentStock * inventoryData.unitCost;
      }

      if (notes) {
        inventoryData.notes = notes.trim();
      }

      if (lowStockThreshold !== undefined) {
        inventoryData.lowStockThreshold = parseInt(lowStockThreshold);
      }

      // Set low stock status
      inventoryData.isLowStock = inventoryData.currentStock <= inventoryData.lowStockThreshold;

      // Create new inventory entry
      const newInventory = await Inventory.create([inventoryData], { session });

      // Commit the transaction
      await session.commitTransaction();

      res.status(201).json({
        status: "success",
        data: {
          inventory: newInventory[0]
        },
        message: "Inventory entry created successfully"
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
    console.log("INVENTORY CREATE ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to create inventory entry"
    });
  }
});

// Get all inventory items
export const getAllInventory = catchAsync(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      brandType,
      storageLocation,
      isLowStock,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (brandType) filter.brandType = brandType;
    if (storageLocation) filter.storageLocation = storageLocation;
    if (isLowStock !== undefined) filter.isLowStock = isLowStock === 'true';

    // Add search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const inventory = await Inventory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('distributionRecords.userId', 'names _id');

    const total = await Inventory.countDocuments(filter);

    res.status(200).json({
      status: "success",
      data: {
        inventory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.log("GET INVENTORY ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to fetch inventory"
    });
  }
});

// Get inventory by ID
export const getInventoryById = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findById(id)
      .populate('distributionRecords.userId', 'names _id');

    if (!inventory) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        inventory
      }
    });

  } catch (error) {
    console.log("GET INVENTORY BY ID ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to fetch inventory item"
    });
  }
});

// Get inventory summary
export const getInventorySummary = catchAsync(async (req, res, next) => {
  try {
    const summary = await Inventory.getInventorySummary();
    const lowStockItems = await Inventory.getLowStockItems();

    res.status(200).json({
      status: "success",
      data: {
        summary: summary[0] || {
          totalBatches: 0,
          totalSupplied: 0,
          totalCurrentStock: 0,
          activeBatches: 0,
          lowStockBatches: 0
        },
        lowStockItems
      }
    });

  } catch (error) {
    console.log("GET INVENTORY SUMMARY ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to fetch inventory summary"
    });
  }
});

// Update inventory
export const updateInventory = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updates.padBatchId;
    delete updates.currentStock;
    delete updates.distributionRecords;
    delete updates.stockAdjustments;
    delete updates.totalDistributed;
    delete updates.stockPercentage;

    const inventory = await Inventory.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!inventory) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        inventory
      },
      message: "Inventory updated successfully"
    });

  } catch (error) {
    console.log("UPDATE INVENTORY ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to update inventory"
    });
  }
});

// Delete inventory
export const deleteInventory = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return res.status(404).json({
        status: "error",
        message: "Inventory item not found"
      });
    }

    // Check if there are distribution records
    if (inventory.distributionRecords.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete inventory item with distribution records"
      });
    }

    await Inventory.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Inventory item deleted successfully"
    });

  } catch (error) {
    console.log("DELETE INVENTORY ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to delete inventory item"
    });
  }
});

// Add these functions to your inventoryController.js file

// Add distribution record
export const addDistribution = catchAsync(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userId, userName, quantityDistributed, distributedBy, reason, notes } = req.body;
  
      const inventory = await Inventory.findById(id);
      if (!inventory) {
        return res.status(404).json({
          status: "error",
          message: "Inventory item not found"
        });
      }
  
      if (quantityDistributed > inventory.currentStock) {
        return res.status(400).json({
          status: "error",
          message: "Insufficient stock for distribution"
        });
      }
  
      const distributionData = {
        userId,
        userName,
        quantityDistributed: parseInt(quantityDistributed),
        distributedBy,
        reason: reason || "Monthly allocation",
        notes
      };
  
      await inventory.addDistribution(distributionData);
  
      res.status(200).json({
        status: "success",
        data: {
          inventory,
          distribution: distributionData
        },
        message: "Distribution recorded successfully"
      });
  
    } catch (error) {
      console.log("ADD DISTRIBUTION ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to record distribution"
      });
    }
  });
  
  // Adjust stock
  export const adjustStock = catchAsync(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { adjustmentType, quantity, reason, adjustedBy } = req.body;
  
      const inventory = await Inventory.findById(id);
      if (!inventory) {
        return res.status(404).json({
          status: "error",
          message: "Inventory item not found"
        });
      }
  
      const adjustmentData = {
        adjustmentType,
        quantity: parseInt(quantity),
        reason,
        adjustedBy
      };
  
      await inventory.adjustStock(adjustmentData);
  
      res.status(200).json({
        status: "success",
        data: {
          inventory,
          adjustment: adjustmentData
        },
        message: "Stock adjustment recorded successfully"
      });
  
    } catch (error) {
      console.log("ADJUST STOCK ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to adjust stock"
      });
    }
  });
  
  // Get low stock items
  export const getLowStockItems = catchAsync(async (req, res, next) => {
    try {
      const lowStockItems = await Inventory.getLowStockItems();
  
      res.status(200).json({
        status: "success",
        data: {
          items: lowStockItems,
          count: lowStockItems.length
        }
      });
  
    } catch (error) {
      console.log("GET LOW STOCK ITEMS ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to fetch low stock items"
      });
    }
  });
  
  // Get inventory by batch ID
  export const getInventoryByBatch = catchAsync(async (req, res, next) => {
    try {
      const { batchId } = req.params;
  
      const inventory = await Inventory.findOne({ padBatchId: batchId })
        .populate('distributionRecords.userId', 'names _id');
  
      if (!inventory) {
        return res.status(404).json({
          status: "error",
          message: "Inventory batch not found"
        });
      }
  
      res.status(200).json({
        status: "success",
        data: {
          inventory
        }
      });
  
    } catch (error) {
      console.log("GET INVENTORY BY BATCH ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to fetch inventory batch"
      });
    }
  });
  
  // Bulk create inventory
  export const bulkCreateInventory = catchAsync(async (req, res, next) => {
    try {
      const { inventoryItems } = req.body;
  
      if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid inventory items array"
        });
      }
  
      const session = await mongoose.startSession();
      session.startTransaction();
  
      try {
        const createdItems = [];
        const errors = [];
  
        for (let i = 0; i < inventoryItems.length; i++) {
          try {
            const item = inventoryItems[i];
            
            // Generate unique batch ID for each item
            let padBatchId;
            let isUnique = false;
            let attempts = 0;
            const maxAttempts = 10;
  
            while (!isUnique && attempts < maxAttempts) {
              padBatchId = generatePadBatchId(item.brandType, item.supplierDonorName);
              const existing = await Inventory.findOne({ padBatchId }).session(session);
              if (!existing) {
                isUnique = true;
              } else {
                attempts++;
              }
            }
  
            if (!isUnique) {
              throw new Error(`Unable to generate unique Pad Batch ID for item ${i + 1}`);
            }
  
            const inventoryData = {
              ...item,
              padBatchId,
              currentStock: parseInt(item.quantitySupplied),
              status: "active",
              distributionRecords: [],
              stockAdjustments: []
            };
  
            const newItem = await Inventory.create([inventoryData], { session });
            createdItems.push(newItem[0]);
  
          } catch (error) {
            errors.push({
              index: i + 1,
              error: error.message
            });
          }
        }
  
        if (errors.length > 0 && createdItems.length === 0) {
          await session.abortTransaction();
          return res.status(400).json({
            status: "error",
            message: "Failed to create any inventory items",
            errors
          });
        }
  
        await session.commitTransaction();
  
        res.status(201).json({
          status: "success",
          data: {
            created: createdItems,
            createdCount: createdItems.length,
            errors: errors.length > 0 ? errors : undefined
          },
          message: `Successfully created ${createdItems.length} inventory items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
  
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
  
    } catch (error) {
      console.log("BULK CREATE INVENTORY ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to bulk create inventory"
      });
    }
  });
  
  // Get inventory statistics
  export const getInventoryStats = catchAsync(async (req, res, next) => {
    try {
      const stats = await Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalBatches: { $sum: 1 },
            totalSupplied: { $sum: '$quantitySupplied' },
            totalCurrentStock: { $sum: '$currentStock' },
            totalValue: { $sum: '$totalValue' },
            activeBatches: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            depletedBatches: {
              $sum: { $cond: [{ $eq: ['$status', 'depleted'] }, 1, 0] }
            },
            expiredBatches: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
            },
            lowStockBatches: {
              $sum: { $cond: ['$isLowStock', 1, 0] }
            }
          }
        }
      ]);
  
      const brandStats = await Inventory.aggregate([
        {
          $group: {
            _id: '$brandType',
            totalBatches: { $sum: 1 },
            totalSupplied: { $sum: '$quantitySupplied' },
            currentStock: { $sum: '$currentStock' }
          }
        },
        { $sort: { totalSupplied: -1 } }
      ]);
  
      const locationStats = await Inventory.aggregate([
        {
          $group: {
            _id: '$storageLocation',
            totalBatches: { $sum: 1 },
            totalSupplied: { $sum: '$quantitySupplied' },
            currentStock: { $sum: '$currentStock' }
          }
        },
        { $sort: { totalSupplied: -1 } }
      ]);
  
      res.status(200).json({
        status: "success",
        data: {
          overview: stats[0] || {
            totalBatches: 0,
            totalSupplied: 0,
            totalCurrentStock: 0,
            totalValue: 0,
            activeBatches: 0,
            depletedBatches: 0,
            expiredBatches: 0,
            lowStockBatches: 0
          },
          brandStats,
          locationStats
        }
      });
  
    } catch (error) {
      console.log("GET INVENTORY STATS ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to fetch inventory statistics"
      });
    }
  });
  
  // Export inventory to Excel (you'll need to install xlsx package)
  export const exportInventoryExcel = catchAsync(async (req, res, next) => {
    try {
      const { status, brandType, storageLocation } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (brandType) filter.brandType = brandType;
      if (storageLocation) filter.storageLocation = storageLocation;
  
      const inventory = await Inventory.find(filter)
        .sort({ createdAt: -1 })
        .lean();
  
      // Transform data for Excel export
      const excelData = inventory.map(item => ({
        'Batch ID': item.padBatchId,
        'Brand Type': item.brandType,
        'Quantity Supplied': item.quantitySupplied,
        'Current Stock': item.currentStock,
        'Supplier/Donor': item.supplierDonorName,
        'Date Received': item.dateReceived ? item.dateReceived.toISOString().split('T')[0] : '',
        'Storage Location': item.storageLocation,
        'Staff in Charge': item.staffInCharge,
        'Staff ID': item.staffId,
        'Status': item.status,
        'Low Stock': item.isLowStock ? 'Yes' : 'No',
        'Unit Cost': item.unitCost || 0,
        'Total Value': item.totalValue || 0,
        'Expiry Date': item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : '',
        'Notes': item.notes || ''
      }));
  
      // Here you would use a library like xlsx to generate the Excel file
      // For now, returning JSON data
      res.status(200).json({
        status: "success",
        data: {
          inventory: excelData,
          count: excelData.length
        },
        message: "Inventory data exported successfully"
      });
  
    } catch (error) {
      console.log("EXPORT INVENTORY ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to export inventory"
      });
    }
  });
  
//   // Helper function (should be moved to utils)
//   const generatePadBatchId = (brandType, supplierName) => {
//     const currentYear = new Date().getFullYear();
//     const month = String(new Date().getMonth() + 1).padStart(2, '0');
//     const day = String(new Date().getDate()).padStart(2, '0');
    
//     const brandInitials = brandType.replace(/\s+/g, '').substring(0, 3).toUpperCase();
//     const supplierInitials = supplierName
//       .split(' ')
//       .map(word => word.charAt(0).toUpperCase())
//       .join('')
//       .substring(0, 3);
    
//     const randomNum = Math.floor(100 + Math.random() * 900);
    
//     return `PAD/${currentYear}${month}${day}/${brandInitials}/${supplierInitials}/${randomNum}`;
//   };


// Distribute pad to student (main checkout API)
export const distributePadToStudent = catchAsync(async (req, res, next) => {
  try {
    const {
      studentUserId,           // From scanned ID card
      staffId,                 // Staff member doing the distribution
      staffName,               // Staff member name
      brandPreference,         // Optional: preferred brand
      storageLocation,         // Which storage location to take from
      reason = "Daily distribution", // Reason for distribution
      notes                    // Optional notes
    } = req.body;

    // Validate required fields
    if (!studentUserId || !staffId || !staffName) {
      return res.status(400).json({
        status: "error",
        message: "Student ID, Staff ID, and Staff Name are required"
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Verify student exists
      const student = await User.findOne({ _id: studentUserId }).session(session);
      if (!student) {
        await session.abortTransaction();
        return res.status(404).json({
          status: "error",
          message: "Student not found"
        });
      }

      // 2. Check for any pad distribution today (across all batches)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alreadyDistributedToday = await Inventory.findOne({
        "distributionRecords.userId": student._id,
        "distributionRecords.createdAt": { $gte: today }
      }).session(session);

      if (alreadyDistributedToday) {
        await session.abortTransaction();
        return res.status(400).json({
          status: "error",
          message: "Student has already received a pad today"
        });
      }

      // 3. Find available inventory
      const inventoryFilter = {
        status: "active",
        currentStock: { $gt: 0 }
      };

      if (storageLocation) {
        inventoryFilter.storageLocation = storageLocation;
      }

      if (brandPreference) {
        inventoryFilter.brandType = brandPreference;
      }

      let availableInventory = await Inventory.find(inventoryFilter)
        .sort({
          brandType: brandPreference ? 1 : 0,
          expiryDate: 1,
          currentStock: -1
        })
        .limit(1)
        .session(session);

      if (availableInventory.length === 0 && brandPreference) {
        delete inventoryFilter.brandType;
        availableInventory = await Inventory.find(inventoryFilter)
          .sort({ expiryDate: 1, currentStock: -1 })
          .limit(1)
          .session(session);
      }

      if (availableInventory.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          status: "error",
          message: storageLocation 
            ? `No pads available in ${storageLocation}` 
            : "No pads available in stock"
        });
      }

      const inventory = availableInventory[0];

      // 4. Create distribution record
      const distributionData = {
        userId: student._id,
        userName: student.names || student.name,
        quantityDistributed: 1,
        distributedBy: `${staffName} (${staffId})`,
        reason,
        notes
      };

      // 5. Add distribution and update stock
      await inventory.addDistribution(distributionData);

      // 6. Get updated inventory
      const updatedInventory = await Inventory.findById(inventory._id).session(session);

      await session.commitTransaction();

      res.status(200).json({
        status: "success",
        data: {
          distribution: {
            ...distributionData,
            distributionId: updatedInventory.distributionRecords[updatedInventory.distributionRecords.length - 1]._id,
            batchId: updatedInventory.padBatchId,
            brandType: updatedInventory.brandType,
            timestamp: new Date()
          },
          student: {
            userId: student._id,
            name: student.names || student.name
          },
          inventory: {
            batchId: updatedInventory.padBatchId,
            brandType: updatedInventory.brandType,
            previousStock: updatedInventory.currentStock + 1,
            currentStock: updatedInventory.currentStock,
            storageLocation: updatedInventory.storageLocation,
            isLowStock: updatedInventory.isLowStock
          },
          staff: {
            staffId,
            staffName
          }
        },
        message: "Pad distributed successfully"
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.log("DISTRIBUTE PAD ERROR ----> ", error);
    res.status(400).json({
      status: "error",
      message: error.message || "Failed to distribute pad"
    });
  }
});

  
  // Get student's distribution history
  export const getStudentDistributionHistory = catchAsync(async (req, res, next) => {
    try {
      const { studentUserId } = req.params;
      const { limit = 10, page = 1 } = req.query;
  
      // Find all distributions for this student across all inventory items
      const distributions = await Inventory.aggregate([
        { $unwind: "$distributionRecords" },
        { $match: { "distributionRecords.userId": studentUserId } },
        { 
          $project: {
            _id: "$distributionRecords._id",
            padBatchId: 1,
            brandType: 1,
            storageLocation: 1,
            distribution: "$distributionRecords"
          }
        },
        { $sort: { "distribution.createdAt": -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      ]);
  
      // Get total count
      const totalCount = await Inventory.aggregate([
        { $unwind: "$distributionRecords" },
        { $match: { "distributionRecords.userId": studentUserId } },
        { $count: "total" }
      ]);
  
      res.status(200).json({
        status: "success",
        data: {
          distributions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil((totalCount[0]?.total || 0) / parseInt(limit)),
            totalItems: totalCount[0]?.total || 0,
            itemsPerPage: parseInt(limit)
          }
        }
      });
  
    } catch (error) {
      console.log("GET STUDENT DISTRIBUTION HISTORY ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to fetch distribution history"
      });
    }
  });
  
  // Check if student can receive pad (eligibility check)
  export const checkStudentEligibility = catchAsync(async (req, res, next) => {
    try {
      const { studentUserId } = req.params;
      const { storageLocation, brandPreference } = req.query;
  
      // 1. Verify student exists
      const student = await User.findOne({ 
        $or: [
          { userId: studentUserId }
        ]
      });
  
      if (!student) {
        return res.status(404).json({
          status: "error",
          message: "Student not found"
        });
      }
  
      // 2. Check for recent distributions (same day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const recentDistribution = await Inventory.findOne({
        "distributionRecords": {
          $elemMatch: {
            userId: student.userId,
            createdAt: { $gte: today }
          }
        }
      });
  
      // 3. Check available stock
      const inventoryFilter = {
        status: "active",
        currentStock: { $gt: 0 }
      };
  
      if (storageLocation) {
        inventoryFilter.storageLocation = storageLocation;
      }
  
      if (brandPreference) {
        inventoryFilter.brandType = brandPreference;
      }
  
      const availableStock = await Inventory.countDocuments(inventoryFilter);
  
      res.status(200).json({
        status: "success",
        data: {
          student: {
            userId: student.userId,
            name: student.names || student.name
          },
          eligible: !recentDistribution && availableStock > 0,
          reasons: {
            alreadyReceivedToday: !!recentDistribution,
            noStockAvailable: availableStock === 0
          },
          lastDistribution: recentDistribution ? {
            date: recentDistribution.distributionRecords.find(r => r.userId === student.userId)?.createdAt,
            batchId: recentDistribution.padBatchId
          } : null,
          availableStock
        }
      });
  
    } catch (error) {
      console.log("CHECK STUDENT ELIGIBILITY ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to check eligibility"
      });
    }
  });
  
  // Get daily distribution report
  export const getDailyDistributionReport = catchAsync(async (req, res, next) => {
    // console.log("westtttt");
    
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
  
      const dailyReport = await Inventory.aggregate([
        { $unwind: "$distributionRecords" },
        {
          $match: {
            "distributionRecords.createdAt": {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              brandType: "$brandType",
              storageLocation: "$storageLocation"
            },
            totalDistributed: { $sum: "$distributionRecords.quantityDistributed" },
            distributions: { $push: "$distributionRecords" }
          }
        },
        {
          $group: {
            _id: null,
            totalPadsDistributed: { $sum: "$totalDistributed" },
            byBrand: {
              $push: {
                brand: "$_id.brandType",
                location: "$_id.storageLocation",
                count: "$totalDistributed"
              }
            },
            uniqueStudents: { $addToSet: "$distributions.userId" }
          }
        },
        {
          $project: {
            totalPadsDistributed: 1,
            uniqueStudentsCount: { $size: "$uniqueStudents" },
            byBrand: 1
          }
        }
      ]);
  
      res.status(200).json({
        status: "success",
        data: {
          date,
          report: dailyReport[0] || {
            totalPadsDistributed: 0,
            uniqueStudentsCount: 0,
            byBrand: []
          }
        }
      });
  
    } catch (error) {
      console.log("GET DAILY DISTRIBUTION REPORT ERROR ----> ", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to generate daily report"
      });
    }
  });


  // controllers/inventoryController.js

  export const getPadDistributionInsights = catchAsync(async (req, res, next) => {
    try {
      const results = await Inventory.aggregate([
        { $unwind: "$distributionRecords" },
  
        // Convert string userId to ObjectId for lookup
        {
          $addFields: {
            userIdObj: { $toObjectId: "$distributionRecords.userId" }
          }
        },
  
        // Lookup user details using ObjectId match
        {
          $lookup: {
            from: "users",
            localField: "userIdObj",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
  
        // Project and convert age to number
        {
          $project: {
            quantityDistributed: "$distributionRecords.quantityDistributed",
            date: "$distributionRecords.createdAt",
            supplierDonorName: "$supplierDonorName",
            numericAge: { $toInt: "$userDetails.age" },
            disabilityType: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$userDetails.disability", "no"] },
                    { $eq: ["$userDetails.disabilityType", ""] }
                  ]
                },
                "No Disability",
                "$userDetails.disabilityType"
              ]
            }
          }
        },
  
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalPadsDistributed: { $sum: "$quantityDistributed" },
                  totalDonors: { $addToSet: "$supplierDonorName" },
                  firstDate: { $min: "$date" },
                  lastDate: { $max: "$date" }
                }
              },
              {
                $project: {
                  _id: 0,
                  totalPadsDistributed: 1,
                  totalDonors: { $size: "$totalDonors" },
                  daysActive: {
                    $dateDiff: {
                      startDate: "$firstDate",
                      endDate: "$lastDate",
                      unit: "day"
                    }
                  },
                  monthsActive: {
                    $dateDiff: {
                      startDate: "$firstDate",
                      endDate: "$lastDate",
                      unit: "month"
                    }
                  }
                }
              },
              {
                $addFields: {
                  avgDaily: {
                    $cond: [
                      { $gt: ["$daysActive", 0] },
                      { $round: [{ $divide: ["$totalPadsDistributed", "$daysActive"] }, 0] },
                      "$totalPadsDistributed"
                    ]
                  },
                  avgMonthly: {
                    $cond: [
                      { $gt: ["$monthsActive", 0] },
                      { $round: [{ $divide: ["$totalPadsDistributed", "$monthsActive"] }, 0] },
                      "$totalPadsDistributed"
                    ]
                  }
                }
              }
            ],
  
            // Time series
            timeSeries: [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                  quantity: { $sum: "$quantityDistributed" }
                }
              },
              { $sort: { _id: 1 } },
              { $project: { date: "$_id", quantity: 1, _id: 0 } }
            ],
  
            // Top donors
            topDonors: [
              {
                $group: {
                  _id: "$supplierDonorName",
                  total: { $sum: "$quantityDistributed" }
                }
              },
              { $sort: { total: -1 } },
              { $limit: 5 },
              { $project: { _id: 0, name: "$_id", total: 1 } }
            ],
  
            // Breakdown by age group
            breakdownAge: [
              {
                $bucket: {
                  groupBy: "$numericAge",
                  boundaries: [10, 14, 17, 20, 200],
                  default: "Unknown",
                  output: { value: { $sum: "$quantityDistributed" } }
                }
              },
              {
                $project: {
                  name: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$_id", 10] }, then: "10-13" },
                        { case: { $eq: ["$_id", 14] }, then: "14-16" },
                        { case: { $eq: ["$_id", 17] }, then: "17-19" },
                        { case: { $eq: ["$_id", 20] }, then: "20+" }
                      ],
                      default: "Unknown"
                    }
                  },
                  value: 1,
                  _id: 0
                }
              }
            ],
  
            // Breakdown by disability type
            breakdownDisability: [
              {
                $group: {
                  _id: "$disabilityType",
                  value: { $sum: "$quantityDistributed" }
                }
              },
              { $project: { _id: 0, name: "$_id", value: 1 } }
            ]
          }
        }
      ]);
  
      const data = results[0] || {
        totals: [],
        timeSeries: [],
        topDonors: [],
        breakdownAge: [],
        breakdownDisability: []
      };
  
      res.status(200).json({
        status: "success",
        data: {
          ...data.totals[0],
          timeSeries: data.timeSeries,
          topDonors: data.topDonors,
          breakdownAge: data.breakdownAge,
          breakdownDisability: data.breakdownDisability
        }
      });
    } catch (error) {
      console.error("GET PAD DISTRIBUTION INSIGHTS ERROR ---->", error);
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to get pad distribution insights"
      });
    }
  });
  
  
  