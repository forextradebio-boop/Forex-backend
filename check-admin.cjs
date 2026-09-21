const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function checkAdmin() {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const admin = await usersCollection.findOne({ role: { $regex: /^admin$/i } });
    if (admin) {
      console.log("Found admin user:", admin.email, "role:", admin.role);
    } else {
      console.log("No admin user found. Creating one...");
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin@1234', 12);
      await usersCollection.insertOne({
        username: 'admin@trading.com',
        fullName: 'Admin User',
        email: 'admin@trading.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Admin user created.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAdmin();
