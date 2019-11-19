const errorMessageService = require('../services/error_message.service')
const moment = require('moment-timezone')

let database = null
let logService = null

class BaseModel {
  constructor (name, table, requiredProperties = null, id = 'id') {
    this._name = name
    this._table = table
    this._requiredProperties = requiredProperties
    this._id = id
  }

  async save (transaction) {
    if (!database) {
      return Promise.reject(new Error('Could not find database, please verify your connection.'))
    }

    if (this._requiredProperties) {
      const hasRequiredProperties = this.hasRequiredProperties()
      if (hasRequiredProperties !== true) {
        return Promise.reject(hasRequiredProperties)
      }
    }

    let query = database(this._table)
    const identifier = this[this._id]

    if (transaction) {
      query = query.transacting(transaction)
    }

    if (identifier && this._id !== 'id') {
      try {
        const existingModel = await database(this._table).where({ [this._id]: identifier }).first()

        query = existingModel ? this.getUpdateQuery(query, identifier) : this.getInsertQuery(query)
      } catch (error) {
        if (logService && logService.error) {
          logService.error(__filename, 'save', error.message, { ...this, table: this._name })
        }

        return Promise.reject(errorMessageService.getGenericError())
      }
    } else if (identifier) {
      query = this.getUpdateQuery(query, identifier)
    } else {
      query = this.getInsertQuery(query)
    }

    return query.then(() => {
      return database(this._table)
        .where({ [this._id]: identifier })
        .first()
        .then((data) => {
          this.fill(data)
          return this
        })
        .catch((error) => {
          if (logService && logService.error) {
            logService.error(__filename, 'save', error.message, { ...this, table: this._table })
          }
          return Promise.reject(errorMessageService.getGenericError())
        })
    })
  }

  async hasRequiredProperties () {
    if (!this._requiredProperties) {
      return true
    }

    let hasInvalidProperty = false
    for (let i = 0; i < this._requiredProperties.length; i++) {
      if (typeof this._requiredProperties[i] !== 'object' || !this._requiredProperties[i].name) {
        continue
      }

      if (!Object.prototype.hasOwnProperty.call(this, this._requiredProperties[i].name)) {
        return Promise.reject(errorMessageService.getRequiredPropertyError(this._name, this._requiredProperties[i].name))
      }

      switch (this._requiredProperties[i].type) {
        case 'int':
          hasInvalidProperty = isNaN(parseInt(this[this._requiredProperties[i].name]))
          break
        case 'float':
          hasInvalidProperty = isNaN(parseFloat(this[this._requiredProperties[i].name]))
          break
        case 'option':
          hasInvalidProperty = !this._requiredProperties[i].options.includes(this[this._requiredProperties[i].name])
          break
        case 'boolean':
          hasInvalidProperty = typeof this[this._requiredProperties[i].name] !== 'boolean'
          break
        case 'string':
          hasInvalidProperty = !(typeof this[this._requiredProperties[i].name] === 'string' && this[this._requiredProperties[i].name].length > 0)
          break
        case 'date':
          hasInvalidProperty = !moment(this[this._requiredProperties[i].name], this._requiredProperties[i].format ? this._requiredProperties[i].format : moment.ISO_8601).isValid()
          break
        default:
          hasInvalidProperty = !this[this._requiredProperties[i].name]
      }

      if (hasInvalidProperty) {
        return Promise.reject(errorMessageService.getRequiredPropertyError(
          this._name,
          this._requiredProperties[i].displayName ? this._requiredProperties[i].displayName : this._requiredProperties[i].name))
      }
    }

    return true
  }

  fill (data) {
    for (const property in data) {
      if (Object.prototype.hasOwnProperty.call(this, property) && property.charAt(0) !== '_') {
        this[property] = data[property]
      }
    }

    return this
  }

  getUpdateQuery (query, identifier) {
    return query.update(this.getSaveData()).where({ [this._id]: identifier })
  }

  getInsertQuery (query) {
    return query.insert(this.getSaveData()).then((rowsIds) => { this[this._id] = rowsIds[0] })
  }

  getSaveData () {
    const data = {}

    for (const property in data) {
      if (Object.prototype.hasOwnProperty.call(this, property) && property.charAt(0) !== '_') {
        data[property] = this[property]
      }
    }

    if (Object.prototype.hasOwnProperty.call(this, 'updatedAt')) {
      data.updatedAt = new Date().toISOString()
    }

    return data
  }
}

exports.initialize = function (knexDB, logger) {
  if (!knexDB) {
    return false
  }

  database = knexDB
  logService = logger
}

exports.BaseModel = BaseModel
