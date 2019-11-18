const errorMessageService = require('./error_message.service')

exports.respondContent = function (response, content) {
  response.status(200).send(content)
}

exports.respondError = function (response, error) {
  response.status(500).send({ message: error.message })
}

exports.respondGenericError = function (response) {
  response.status(500).send({ message: errorMessageService.getGenericError().message })
}

exports.respondNoContent = function (response) {
  response.status(204).send()
}

exports.respondNotFound = function (response, name) {
  response.status(404).send({ message: errorMessageService.getNotFoundError(name).message })
}

exports.respondUnauthorized = function (response, error) {
  response.status(401).send({ message: error.message })
}
