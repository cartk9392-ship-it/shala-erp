const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin exists
    const adminExists = await User.findOne({ username: 'tejas' });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    await User.create({
      username: 'tejas',
      password: 'tejas4010',
      name: 'Tejas',
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
