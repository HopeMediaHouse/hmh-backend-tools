const errorMessageService = require('../services/error_message.service')
const moment = require('moment-timezone')
const privateMap = new WeakMap()

let database = null
let logService = null

class BaseModel {
  constructor (name, table, propertyRequirements = null, id = 'id') {
    privateMap.set(this, {
      id: id,
      name: name,
      propertyRequirements: propertyRequirements,
      table: table
    })
  }

  async save (transaction) {
    const canSave = this.canSave()
    if (canSave !== true) {
      return Promise.reject(canSave)
    }

    if (this.getPropertyRequirements()) {
      const hasValidProperties = this.hasValidProperties()
      if (hasValidProperties !== true) {
        return Promise.reject(hasValidProperties)
      }
    }

    let query = database(this.getTableName())
    if (transaction) {
      query = query.transacting(transaction)
    }

    if (this[this.getIdPropertyName()] && this.getIdPropertyName() !== 'id') {
      try {
        const existingModel = await database(this.getTableName()).where(this.getIdPropertyName(), this[this.getIdPropertyName()]).first()

        query = existingModel ? this.getUpdateQuery(query) : this.getInsertQuery(query)
      } catch (error) {
        if (logService && logService.error) {
          logService.error(__filename, 'save', error.message, { ...this, table: this.getTableName() })
        }

        return Promise.reject(errorMessageService.getGenericError())
      }
    } else if (this[this.getIdPropertyName()]) {
      query = this.getUpdateQuery(query)
    } else {
      query = this.getInsertQuery(query)
    }

    return query.then(() => {
      return database(this.getTableName())
        .where(this.getIdPropertyName(), this[this.getIdPropertyName()])
        .first()
        .then((data) => {
          this.fill(data)
          return this
        })
        .catch((error) => {
          if (logService && logService.error) {
            logService.error(__filename, 'save', error.message, { ...this, table: this.getTableName() })
          }
          return Promise.reject(errorMessageService.getGenericError())
        })
    })
  }

  hasValidProperties () {
    const propertyRequirements = this.getPropertyRequirements()
    if (!propertyRequirements) {
      return true
    }

    let hasInvalidProperty = false
    for (let i = 0; i < propertyRequirements.length; i++) {
      if (typeof propertyRequirements[i] !== 'object' || !propertyRequirements[i].name) {
        continue
      }

      if (propertyRequirements[i].isRequired !== false &&
        (!Object.prototype.hasOwnProperty.call(this, propertyRequirements[i].name) || this[propertyRequirements[i].name] === null)) {
        return errorMessageService.getRequiredPropertyError(
          this.getModelName(),
          propertyRequirements[i].displayName ? propertyRequirements[i].displayName : propertyRequirements[i].name)
      }

      if (propertyRequirements[i].isRequired === false && (this[propertyRequirements[i].name] === null || this[propertyRequirements[i].name] === undefined)) {
        continue
      }

      switch (propertyRequirements[i].type) {
        case 'int':
          hasInvalidProperty = isNaN(parseInt(this[propertyRequirements[i].name]))
          break
        case 'float':
          hasInvalidProperty = isNaN(parseFloat(this[propertyRequirements[i].name]))
          break
        case 'option':
          hasInvalidProperty = !propertyRequirements[i].options.includes(this[propertyRequirements[i].name])
          break
        case 'boolean':
          hasInvalidProperty = typeof this[propertyRequirements[i].name] !== 'boolean'
          break
        case 'string':
          hasInvalidProperty = !(typeof this[propertyRequirements[i].name] === 'string' && this[propertyRequirements[i].name].length > 0)
          break
        case 'date':
          hasInvalidProperty = !moment(this[propertyRequirements[i].name], propertyRequirements[i].format ? propertyRequirements[i].format : moment.ISO_8601).isValid()
          break
        default:
          hasInvalidProperty = !this[propertyRequirements[i].name]
      }

      if (hasInvalidProperty) {
        return errorMessageService.getRequiredPropertyError(
          this.getModelName(),
          propertyRequirements[i].displayName ? propertyRequirements[i].displayName : propertyRequirements[i].name)
      }
    }

    return true
  }

  fill (data) {
    for (const property in data) {
      if (Object.prototype.hasOwnProperty.call(this, property)) {
        this[property] = data[property]
      }
    }

    return this
  }

  getUpdateQuery (query) {
    if (Object.prototype.hasOwnProperty.call(this, 'updatedAt')) {
      this.updatedAt = new Date().toISOString()
    }

    return query.update(this).where(this.getIdPropertyName(), this[this.getIdPropertyName()])
  }

  getInsertQuery (query) {
    return query.insert(this).then((rowsIds) => { this[this.getIdPropertyName()] = rowsIds[0] })
  }

  canSave () {
    if (!database) {
      if (logService && logService.error) {
        logService.error(__filename, 'canSave', 'Could not find database, please verify your connection', { ...this })
      }

      return new Error('Could not find database, please verify your connection.')
    }

    if (!this.getModelName() || !this.getTableName() || !this.getIdPropertyName()) {
      if (logService && logService.error) {
        logService.error(__filename, 'canSave', 'Missing map data, this should not happen', { ...privateMap.get(this) })
      }

      return errorMessageService.getGenericError()
    }

    return true
  }

  getModelName () {
    const privateMapData = privateMap.get(this)
    return privateMapData && privateMapData.name ? privateMapData.name : null
  }

  getTableName () {
    const privateMapData = privateMap.get(this)
    return privateMapData && privateMapData.table ? privateMapData.table : null
  }

  getIdPropertyName () {
    const privateMapData = privateMap.get(this)
    return privateMapData && privateMapData.id ? privateMapData.id : null
  }

  getPropertyRequirements () {
    const privateMapData = privateMap.get(this)
    return privateMapData && privateMapData.propertyRequirements ? privateMapData.propertyRequirements : null
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
