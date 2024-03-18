import cloudinary from 'cloudinary';

// config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  // api_key: process.env.CLOUDINARY_API_KEY,
  // api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const upload = async (req, res) => {
  try {
    let result = await cloudinary.v2.uploader.upload(req.body.image, {
      timeout: 1000000000,
      public_id: `${Date.now()}`,
      resource_type: 'auto', // jpeg, png
    })
    res.json({
      public_id: result.public_id,
      url: result.secure_url,
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({
      err: error,
    });
  }
}

export const remove = (req, res) => {
  let image_id = req.body.public_id

  cloudinary.uploader.destroy(image_id, (err, result) => {
    if (err) return res.json({ success: false, err })
    res.send('ok')
  })
}
