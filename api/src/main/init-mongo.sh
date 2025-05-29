# mongo-init/init-mongo.sh
echo "Creating mongo users..."

mongosh admin --host localhost -u root -p 4dm1n <<-EOJS
  use ${DATABASE_NAME:-space_db};
  db.createUser({
    user: '${DATABASE_USERNAME:-mongoUser}',
    pwd: '${DATABASE_PASSWORD:-mongoPassword}',
    roles: [{role: 'readWrite', db: '${DATABASE_NAME:-space_db}'}, {role: 'dbAdmin', db: '${DATABASE_NAME:-space_db}'}]
  });
EOJS
echo "Mongo users created."
