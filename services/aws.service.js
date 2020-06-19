const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const request = require('request')

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

exports.uploadFromUrl = async function (bucket, folder, url) {
  if (!bucket) {
    return Promise.reject(new Error('AWS is not initialized'))
  }

  return new Promise(function (resolve, reject) {
    request({
      url: url,
      encoding: null
    }, function (error, res, body) {
      if (error) {
        if (logService) {
          logService.error(__filename, 'uploadFromUrl', error.message, { bucket: bucket, folder: folder, url: url })
        }
        return reject(new Error('File upload error'))
      }

      const key = folder + '/' + Date.now().toString() + '_' + url.replace('https://', '').replace('http://', '')
      new aws.S3().putObject({
        Bucket: bucket,
        Key: key,
        ContentType: res.headers['content-type'],
        ContentLength: res.headers['content-length'],
        Body: body
      }, function (error) {
        if (error) {
          if (logService) {
            logService.error(__filename, 'uploadFromUrl', error.message, { bucket: bucket, folder: folder, url: url })
          }
          return reject(new Error('File upload error'))
        }

        resolve(key)
      })
    })
  })
}
