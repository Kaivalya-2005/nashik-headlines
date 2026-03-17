// =============================================
// ADMIN PANEL - MYSQL DATABASE CONFIG
// Using Sequelize ORM
// =============================================

const { Sequelize } = require('sequelize');

// Initialize Sequelize connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'nashik_headlines',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        timezone: process.env.TZ || '+05:30' // IST
    }
);

// Test connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Database connected successfully');
        
        // Sync models with database (creates tables if they don't exist)
        if (process.env.NODE_ENV === 'development') {
            // Don't alter existing tables to avoid foreign key conflicts
            await sequelize.sync({ force: false });
            console.log('✅ Database models synchronized');
        }
        
        return sequelize;
    } catch (error) {
        console.error('❌ Unable to connect to MySQL database:', error.message);
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    connectDB,
    Sequelize
};
