const Api = require('../../core/api')
const { search } = require('../../core/db')

module.exports = new Api.Rest({
  name: 'application/search',
  label: 'Search',
  GET: {
    model: {
      label: 'Search',
      async handler (req) {
        let { offset, limit, descending, sortBy } = req.query
        return search.findAndCountAll({
          limit,
          offset,
          order: [[sortBy, descending ? 'DESC' : 'ASC']]
        })
      }
    }
  }
})
