const Api = require('../../core/api')
const { Search, Op } = require('../../core/db')

module.exports = new Api.Rest({
  name: 'application/search',
  label: 'Search',
  GET: {
    model: {
      label: 'Search',
      async handler (req) {
        const { offset, limit, descending, sortBy, search } = req.query
        const options = {}
        if (limit !== '-1') {
          options.limit = limit
        }
        if (offset) {
          options.offset = offset
        }

        if (search) {
          options.where = {
            [Op.or]: [
              {
                key: {
                  [Op.iLike]: `%${search}%`
                }
              },
              {
                value: {
                  [Op.iLike]: `%${search}%`
                }
              }
            ]
          }
        }

        return Search.findAndCountAll({
          ...options,
          order: [[sortBy, descending === 'true' ? 'DESC' : 'ASC']]
        })
      }
    }
  }
})
