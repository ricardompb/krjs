module.exports = async () => {
  return {
    development: {
      database: process.env.ENVIRONMENT_DATABASE_NAME,
      username: process.env.ENVIRONMENT_DATABASE_USERNAME,
      password: process.env.ENVIRONMENT_DATABASE_PASSWORD,
      host: process.env.ENVIRONMENT_DATABASE_HOST,
      dialect: process.env.ENVIRONMENT_DATABASE_DIALECT,
      port: process.env.ENVIRONMENT_DATABASE_PORT,
      seederStorage: 'sequelize',
      seederStorageTableName: 'sequelize_seed',
      migrationStorageTableName: 'sequelize_meta'
    },
    production: {
      database: process.env.ENVIRONMENT_DATABASE_NAME,
      username: process.env.ENVIRONMENT_DATABASE_USERNAME,
      password: process.env.ENVIRONMENT_DATABASE_PASSWORD,
      host: process.env.ENVIRONMENT_DATABASE_HOST,
      dialect: process.env.ENVIRONMENT_DATABASE_DIALECT,
      port: process.env.ENVIRONMENT_DATABASE_PORT,
      seederStorage: 'sequelize',
      seederStorageTableName: 'sequelize_seed',
      migrationStorageTableName: 'sequelize_meta'
    }
  }
}
