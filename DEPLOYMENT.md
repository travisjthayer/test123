# EC2 Deployment Guide

## Prerequisites
- EC2 instance running Ubuntu/Amazon Linux
- Node.js 18+ installed
- PostgreSQL installed and configured
- Git installed

## EC2 Security Group Configuration
Ensure the following ports are open in your EC2 Security Group:
- **Port 22**: SSH access
- **Port 3000**: Application access (or your chosen PORT)
- **Port 5432**: PostgreSQL (if database is on same instance)

## Deployment Steps

### 1. Clone Repository
```bash
git clone [your-repo-url]
cd satrac-migration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
# Update with your database credentials and settings
```

### 4. Set Up Database
```bash
# Run the schema creation
psql -U postgres -d your_database < schema.sql
```

### 5. Create Upload Directory
```bash
mkdir -p uploads
chmod 755 uploads
```

### 6. Test the Application
```bash
node server.js
# Access at http://your-ec2-public-ip:3000
```

### 7. Production Setup with PM2 (Recommended)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
pm2 start server.js --name satrac-app

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

### 8. Optional: Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt-get update
sudo apt-get install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/satrac

# Add configuration:
server {
    listen 80;
    server_name your-ec2-public-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/satrac /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Variables for Production

```bash
# Required
DB_HOST=localhost          # or RDS endpoint if using AWS RDS
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Optional
CORS_ORIGIN=http://your-domain.com  # Set for production security
```

## Monitoring

### View Application Logs
```bash
# If using PM2
pm2 logs satrac-app

# Or view PM2 status
pm2 status
```

### Restart Application
```bash
pm2 restart satrac-app
```

## Security Considerations

1. **Use HTTPS**: Consider setting up SSL certificates with Let's Encrypt
2. **Firewall**: Configure UFW or iptables for additional security
3. **Database**: Use strong passwords and consider using AWS RDS for production
4. **Secrets**: Never commit `.env` file to git
5. **Updates**: Keep Node.js and dependencies updated

## Troubleshooting

### Application not accessible:
- Check EC2 Security Group rules
- Verify application is running: `pm2 status`
- Check firewall: `sudo ufw status`

### Database connection issues:
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Ensure database allows connections from localhost

### Port already in use:
- Change PORT in `.env` file
- Or kill the process using the port: `sudo lsof -i :3000`