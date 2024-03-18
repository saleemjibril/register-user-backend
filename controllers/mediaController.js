import Media from "../models/mediaModel.js";
import catchAsync from "../utils/catchAsync.js";


export const uploadMedia = catchAsync(async (req, res, next) => {
  // const { name, level, email, studentClass, profilePicture } = req.body;

  // if (!name || !level || !email || !studentClass || !profilePicture) {
  //   res.status(400).json({
  //     status: "fail",
  //     message: "Please provide necessary Information",
  //   });
  // }

  // const existingEmail = await Student.findOne({ email });

  // if (existingEmail) {

  //   res.status(400).json({
  //     status: "fail",
  //     message: `Student email already exists. Please use another`,
  //   });
  // }



  // const id = parseInt(crypto.randomBytes(4).toString('hex'), 16) 
  // .toString()
  // .slice(0,7); 
  // const studentId = `HK${id}`;

  const newMedia = await Media.create(req.body);

  res.status(200).json({
    status: "success",
    message:
      "Media uploaded successfully",
  });
});

export const updateMedia = catchAsync(async (req, res) => {
  try {
    console.log('body', req.body);
    const updated = await Media.findOneAndUpdate({ mediaType: req.body.mediaType}, req.body);
    res.status(200).json({
      status: "success",
      message:
        "Media updated successfully",
    });
  } catch (err) {
    console.log("IMAGE UPDATE ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});
export const getAllMedia = catchAsync(async (req, res) => {
  try {
    let media;
    if(req.query.type) {
      media = await Media.find({type: req.query.type})
    }else {
      media = await Media.find({})
    }
    res.status(200).json({
      status: "success",
      media
    });
  } catch (err) {
    console.log("IMAGES FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});

export const getMedia = catchAsync(async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    res.status(200).json({
      status: "success",
      media
    });
  } catch (err) {
    console.log("MEDIA FETCH ERROR ----> ", err);
    res.status(400).json({
      err: err.message,
    });
  }
});