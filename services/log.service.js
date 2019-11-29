const fs = require('fs')
const morgan = require('morgan')
const rfs = require('rotating-file-stream')
const winston = require('winston')

const config = {
  accessLog: 'access.log',
  accessErrorLog: 'access-error.log',
  errorLog: 'error.log',
  fatalLog: 'fatal.log',
  infoLog: 'info.log',
  folder: 'logs',
  rotateSize: '5M'
}

let errorLogger = null
let infoLogger = null

exports.initialize = function (app) {
  if (!app) {
    return false
  }

  errorLogger = createLogger(config.folder + '/' + config.errorLog, errorFormatter)
  infoLogger = createLogger(config.folder + '/' + config.infoLog, infoFormatter)

  fs.existsSync(config.folder) || fs.mkdirSync(config.folder)

  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode >= 400 },
    stream: createRotatingFileStream(config.accessLog)
  }))
  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 },
    stream: createRotatingFileStream(config.accessErrorLog)
  }))

  createRotatingFileStream(config.errorLog)
  createRotatingFileStream(config.fatalLog)
  createRotatingFileStream(config.infoLog)

  winston.exceptions.handle(
    new winston.transports.File({ filename: config.folder + '/' + config.fatalLog })
  )
}

exports.error = function (filename, functionName, message, parameters) {
  if (errorLogger) {
    errorLogger.log({ level: 'error', message: message, filename: filename, functionName: functionName, parameters: JSON.stringify(parameters) })
  }
}

exports.info = function (filename, functionName, message) {
  if (infoLogger) {
    infoLogger.log({ level: 'info', message: message, filename: filename, functionName: functionName })
  }
}

function createLogger (filename, formatter) {
  const transports = [new winston.transports.File({ filename: filename })]

  if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.Console())
  }

  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => formatter(info))),
    transports: transports
  })
}

function createRotatingFileStream (filename) {
  return rfs.createStream(filename, {
    path: config.folder,
    size: config.rotateSize
  })
}

function errorFormatter (info) {
  return `{"timestamp":"${info.timestamp}","filename":"${info.filename}","functionName":"${info.functionName}","message":"${info.message}","parameters":${info.parameters}}`
}

function infoFormatter (info) {
  return `{"timestamp":"${info.timestamp}","filename":"${info.filename}","functionName":"${info.functionName}","message":"${info.message}"}`
}
