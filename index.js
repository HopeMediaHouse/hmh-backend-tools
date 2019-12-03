const awsService = require('./services/aws.service')
const logService = require('./services/log.service')
const knexBaseModel = require('./models/knex_base.model')

exports.initializeAwsService = function (config, logService) {
  awsService.initialize(config, logService)
}

exports.initializeLogService = function (app) {
  logService.initialize(app)
}

exports.initializeKnexDB = function (database, logService) {
  knexBaseModel.initialize(database, logService)
}

exports.awsService = require('./services/aws.service')
exports.errorMessageService = require('./services/error_message.service')
exports.logService = logService
exports.responseService = require('./services/response.service')
exports.KnexBaseModel = knexBaseModel.BaseModel
