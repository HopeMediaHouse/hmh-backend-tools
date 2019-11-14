const logger = require('./services/log.service')

exports.initializeLogger = function (app) {
  logger.initialize(app)
}

exports.logger = logger
