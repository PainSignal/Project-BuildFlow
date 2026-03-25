-- Grant buildflow user permission to create databases (required for Prisma shadow database)
GRANT ALL PRIVILEGES ON *.* TO 'buildflow'@'%';
FLUSH PRIVILEGES;
