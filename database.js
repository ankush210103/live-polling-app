const mongoose = require("mongoose");
require("dotenv").config();

const dbURI = process.env.DB_URL; // Ensure this is correctly set in your .env file

mongoose.connect(dbURI)
  .then(() => console.log("DB connected successfully"))
  .catch(err => console.error("Database connection error:", err));
