const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')

let logService = null

exports.initialize = function (config, logger) {
  aws.config.update(config)
  logService = logger
}

exports.getSignedS3Url = async function (bucket, file) {
  return new Promise((resolve) => {
    new aws.S3().getSignedUrl('getObject', {
      Bucket: bucket,
      Key: file
    }, function (error, url) {
      if (error) {
        if (logService) {
          logService.error(__filename, 'getSignedS3Url', error.message, { bucket: bucket, file: file })
        }

        return resolve(null)
      }

      resolve(url)
    })
  })
}

exports.upload = async function (bucket, folder, req, res) {
  if (!bucket) {
    return Promise.reject(new Error('AWS is not initialized'))
  }

  return new Promise(function (resolve, reject) {
    multer({
      storage: multerS3({
        s3: new aws.S3(),
        bucket: bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, folder + '/' + Date.now().toString() + '.' + file.mimetype.split('/')[1])
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
