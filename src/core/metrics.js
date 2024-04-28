module.exports = (() => {
  const PromClient = require('prom-client')
  const res = {
    register: new PromClient.Registry(),
    aggregatorRegistry: new PromClient.AggregatorRegistry()
  }
  PromClient.collectDefaultMetrics({ register: res.register })

  res.Gauge = ({ name, help, labelNames }) => {
    res[name] = new PromClient.Gauge({
      name,
      help,
      labelNames
    })
    res.register.registerMetric(res[name])
  }

  return res
})()
