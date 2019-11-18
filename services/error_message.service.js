exports.ACTION_ARCHIVE = 'archive'
exports.ACTION_DELETE = 'delete'
exports.ACTION_DISABLE = 'disable'
exports.ACTION_ENABLE = 'enable'
exports.ACTION_GETTING = 'getting'
exports.ACTION_SEARCHING = 'searching'
exports.ACTION_UPDATE = 'update'

exports.getAlreadyExistsError = function (modelName, propertyName) {
  return new Error('A ' + modelName + ' already exists with that ' + propertyName + '.')
}

exports.getCouldNotVerifyUniquePropertyError = function (modelName, propertyName) {
  return new Error('Could not verify that the ' + modelName + ' ' + propertyName + ' is available.')
}

exports.getNoModelForActionError = function (modelName, action) {
  return new Error('No ' + modelName + ' to ' + action + '.')
}

exports.getNotFoundError = function (modelName) {
  return new Error('That ' + modelName + ' does not exist.')
}

exports.getRequiredPropertyError = function (modelName, propertyName) {
  return new Error('A ' + propertyName + ' is required for a ' + modelName + '.')
}

exports.getInvalidPropertyError = function (modelName, propertyName) {
  return new Error('Invalid ' + propertyName + ' for a ' + modelName + '.')
}

exports.getQueryTryAgainError = function (name, action) {
  return new Error('An error occured while ' + action + ' ' + name + ', please try again later.')
}

exports.getGenericError = function () {
  return new Error('An error occured, please try again later.')
}
