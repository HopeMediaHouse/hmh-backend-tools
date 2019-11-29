const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const path = require('path')

let bucket = null
let logService = null

exports.initialize = function (config, bucketName, logger) {
  aws.config.update(config)
  bucket = bucketName
  logService = logger
}

exports.upload = async function (folder, req, res) {
  return new Promise(function (resolve, reject) {
    multer({
      storage: multerS3({
        s3: new aws.S3(),
        bucket: bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, folder + '/' + Date.now().toString() + path.extname(file.originalname) || '.' + file.mimetype.split('/')[1])
        }
      })
    })
      .single('file')(req, res, function (error) {
        if (error) {
          if (logService) {
            logService.error(__filename, 'upload', error.message, { bucket: bucket, folder: folder })
          }
          return reject(new Error('File upload error'))
        }

        resolve()
      })
  })
}

exports.getSignedS3Url = async function (file) {
  return new Promise((resolve) => {
    new aws.S3().getSignedUrl('getObject', {
      Bucket: bucket,
      Key: file
    }, function (error, url) {
      if (error) {
        if (logService) {
          logService.error(__filename, 'getSignedS3Url', error.message, { file: file })
        }

        return resolve(null)
      }

      resolve(url)
    })
  })
}
