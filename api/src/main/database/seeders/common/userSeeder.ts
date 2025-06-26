import UserMongoose from '../../../repositories/mongoose/models/UserMongoose.js';

/**
 * Creates a default admin user if it does not exist
 */
export const seedDefaultAdmin = async () => {
  try {
    // Check if an admin already exists
    const existingAdmin = await UserMongoose.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      console.log('An admin user already exists, skipping initialization');
      return;
    }

    const adminUsername = process.env.ADMIN_USER ?? 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'space4all';

    // Create default admin user
    const admin = new UserMongoose({
      username: adminUsername,
      password: adminPassword, // It will be automatically encrypted by the pre-save hook
      role: 'ADMIN'
    });

    // Save admin
    await admin.save();
    
    if (process.env.ENVIRONMENT !== 'production') {
      console.log('Admin user successfully created:');
      console.log(`\tUsername: ${adminUsername}`);
      console.log(`\tPassword: ${adminPassword}`);
      console.log(`\tAPI Key: ${admin.apiKey}`);
    }
    
    return admin;
  } catch (error) {
    console.error('Error creating the admin user:', error);
    throw error;
  }
};
