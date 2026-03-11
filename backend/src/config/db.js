const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB połączono: ${conn.connection.host}`);
  } catch (error) {
    console.error('Błąd połączenia z MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
