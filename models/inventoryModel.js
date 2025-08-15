import mongoose from "mongoose";

const distributionRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: "User"
  },
  userName: {
    type: String,
    required: true
  },
  quantityDistributed: {
    type: Number,
    required: true,
    min: 1
  },
  distributedBy: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: "Monthly allocation"
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

const stockAdjustmentSchema = new mongoose.Schema({
  adjustmentType: {
    type: String,
    enum: ["addition", "reduction", "correction"],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  adjustedBy: {
    type: String,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const inventorySchema = new mongoose.Schema(
  {
    padBatchId: {
      type: String,
      unique: true,
      required: [true, "Pad Batch ID is required"],
      index: true
    },
    brandType: {
      type: String,
      required: [true, "Brand/Type is required"],
      enum: [
        "Always Ultra",
        "Whisper Choice", 
        "Stayfree",
        "Kotex",
        "Carefree",
        "Generic Brand",
        "Donated Pads",
        "Other"
      ]
    },
    quantitySupplied: {
      type: Number,
      required: [true, "Quantity supplied is required"],
      min: [1, "Quantity must be at least 1"]
    },
    currentStock: {
      type: Number,
      required: true,
      min: [0, "Current stock cannot be negative"]
    },
    supplierDonorName: {
      type: String,
      required: [true, "Supplier/Donor name is required"],
      trim: true
    },
    dateReceived: {
      type: Date,
      required: [true, "Date received is required"]
    },
    storageLocation: {
      type: String,
      required: [true, "Storage location is required"],
      enum: [
        "School Clinic",
        "Designated Pad Bank Room",
        "Administrative Office",
        "Nurse's Office",
        "Girls' Changing Room",
        "Main Storage Room",
        "Other"
      ]
    },
    staffInCharge: {
      type: String,
      required: [true, "Staff in charge is required"],
      trim: true
    },
    staffId: {
      type: String,
      required: [true, "Staff ID is required"],
      trim: true
    },
    expiryDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["active", "depleted", "expired", "damaged"],
      default: "active"
    },
    unitCost: {
      type: Number,
      min: 0
    },
    totalValue: {
      type: Number,
      min: 0
    },
    distributionRecords: [distributionRecordSchema],
    stockAdjustments: [stockAdjustmentSchema],
    notes: {
      type: String,
      trim: true
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0
    },
    isLowStock: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating total distributed
inventorySchema.virtual('totalDistributed').get(function() {
  return this.distributionRecords.reduce((total, record) => total + record.quantityDistributed, 0);
});

// Virtual for calculating remaining percentage
inventorySchema.virtual('stockPercentage').get(function() {
  return this.quantitySupplied > 0 ? (this.currentStock / this.quantitySupplied) * 100 : 0;
});

// Pre-save middleware to update current stock and low stock status
inventorySchema.pre('save', function(next) {
  // Update current stock based on initial supply minus total distributed
  const totalDistributed = this.distributionRecords.reduce((total, record) => total + record.quantityDistributed, 0);
  const totalAdjustments = this.stockAdjustments.reduce((total, adj) => {
    return adj.adjustmentType === 'addition' ? total + adj.quantity : total - adj.quantity;
  }, 0);
  
  this.currentStock = this.quantitySupplied - totalDistributed + totalAdjustments;
  
  // Update low stock status
  this.isLowStock = this.currentStock <= this.lowStockThreshold;
  
  // Update status based on current stock
  if (this.currentStock <= 0) {
    this.status = 'depleted';
  } else if (this.expiryDate && new Date() > this.expiryDate) {
    this.status = 'expired';
  } else if (this.status === 'depleted' && this.currentStock > 0) {
    this.status = 'active';
  }
  
  // Calculate total value if unit cost is provided
  if (this.unitCost) {
    this.totalValue = this.currentStock * this.unitCost;
  }
  
  next();
});

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function() {
  return this.find({ isLowStock: true, status: 'active' });
};

// Static method to get inventory summary
inventorySchema.statics.getInventorySummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalBatches: { $sum: 1 },
        totalSupplied: { $sum: '$quantitySupplied' },
        totalCurrentStock: { $sum: '$currentStock' },
        activeBatches: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        lowStockBatches: {
          $sum: { $cond: ['$isLowStock', 1, 0] }
        }
      }
    }
  ]);
};

// Instance method to add distribution record
inventorySchema.methods.addDistribution = function(distributionData) {
  if (distributionData.quantityDistributed > this.currentStock) {
    throw new Error('Insufficient stock for distribution');
  }
  
  this.distributionRecords.push(distributionData);
  return this.save();
};

// Instance method to add stock adjustment
inventorySchema.methods.adjustStock = function(adjustmentData) {
  adjustmentData.previousStock = this.currentStock;
  
  if (adjustmentData.adjustmentType === 'addition') {
    adjustmentData.newStock = this.currentStock + adjustmentData.quantity;
  } else {
    adjustmentData.newStock = Math.max(0, this.currentStock - adjustmentData.quantity);
  }
  
  this.stockAdjustments.push(adjustmentData);
  return this.save();
};

// Indexes for performance
inventorySchema.index({ padBatchId: 1 }, { unique: true });
inventorySchema.index({ brandType: 1 });
inventorySchema.index({ supplierDonorName: 1 });
inventorySchema.index({ storageLocation: 1 });
inventorySchema.index({ staffInCharge: 1 });
inventorySchema.index({ staffId: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ isLowStock: 1 });
inventorySchema.index({ dateReceived: -1 });
inventorySchema.index({ currentStock: 1 });

// Text index for search functionality
inventorySchema.index({ 
  padBatchId: "text",
  brandType: "text",
  supplierDonorName: "text",
  staffInCharge: "text"
});

// Compound indexes for common queries
inventorySchema.index({ status: 1, storageLocation: 1 });
inventorySchema.index({ brandType: 1, storageLocation: 1 });
inventorySchema.index({ isLowStock: 1, status: 1 });
inventorySchema.index({ dateReceived: -1, status: 1 });

// Timestamps indexes
inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ updatedAt: -1 });

// Indexes for nested arrays
inventorySchema.index({ "distributionRecords.userId": 1 });
inventorySchema.index({ "distributionRecords.createdAt": -1 });
inventorySchema.index({ "stockAdjustments.createdAt": -1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;