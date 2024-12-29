import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import crypto from "crypto";



export const protect = catchAsync(async (req, res, next) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access.",
      });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      res.status(401).json({
        status: "fail",
        message: "The user belonging to this token does no longer exist.",
      });
    }
    if (currentUser.changePasswordAfter(decoded.iat)) {
      res.status(401).json({
        status: "fail",
        message: "User recently changed password! Please log in again.",
      });
    }
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  });

  const signToken = (
    id,
    role
  ) => {
    const expirationPeriod = 7 * 24 * 60 * 60;
    const expirationTimestamp = Math.floor(Date.now() / 1000) + expirationPeriod;

    return jwt.sign(
      {
        id,
       role,
       exp: expirationTimestamp
      },
      process.env.JWT_SECRET,
    );
  };

  const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(
      user._id,
      user.role    );
  
  //   res.cookie("jwt", token, {
  //     expires: new Date(
  //       Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //     ),
  //     httpOnly: true,
  //   });
  
    user.password = undefined;
    // const {
    //   interests,
    // } = user
  
    res.status(statusCode).json({
      status: "success",
      token,
      // interests,
    });
  };
  

  export const register = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;
    
  
    if (!username || !password) {
      res.status(400).json({
        status: "fail",
        message: "Please provide necessary Information",
      });
    }
  
    const existingUsername = await User.findOne({ username });
  
    if (existingUsername) {
      res.json({
        status: "fail",
        message: "Username already exists. Please use another",
      });
    }
  
    const newUser = await User.create({
      username,
      password,
    });
  
  
    res.status(200).json({
      status: "success",
      message:
        "Account Created Successfully",
    });
  
  });
  

  // Login User
export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  console.log("req.bodyuu", req.body);

  if (!username || !password) {
    res.status(400).json({
      status: "fail",
      message: "Please provide username and password",
    });
  }

  const user = await User.findOne({
        username: username.toLowerCase(),
  }).select("+password");


  if (!user || !(await user.comparePassword(password, user.password))) {
    res.status(403).json({
      status: "fail",
      message: "Incorrect username or password",
    });
  } else {
    user.lastLoginDate = Date.now();
    await user.save();
    createSendToken(user, 200, req, res);
  }
});