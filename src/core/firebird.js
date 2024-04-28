const Firebird = require('node-firebird')

module.exports = function (options) {
  const commit = async (db, transaction) => {
    return new Promise((resolve, reject) => {
      transaction.commit((err) => {
        if (err) {
          transaction.rollback()
          reject(err)
        } else {
          db.detach()
          resolve()
        }
      })
    })
  }
  const connectAndExecute = async (action) => {
    return new Promise((resolve, reject) => {
      Firebird.attach({ ...options, lowercase_keys: true, encoding: 'NONE' }, (err, db) => {
        if (err) {
          reject(err)
          return
        }
        action(db)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            db.detach()
          })
      })
    })
  }
  this.query = async (sql) => {
    return connectAndExecute(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(result)
        })
      })
    })
  }
  this.executeNonQuery = async (command, values) => {
    return connectAndExecute(async (db) => {
      return new Promise((resolve, reject) => {
        db.transaction(Firebird.ISOLATION_READ_COMMITTED, async (err, transaction) => {
          if (err) {
            reject(err)
            return
          }
          try {
            await transaction.query(command, values)
            await commit(db, transaction)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      })
    })
  }
  return this
}
