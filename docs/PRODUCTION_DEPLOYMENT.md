# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Claude Development Portfolio's standalone terminal system to production environments. The system supports both VS Code-integrated and standalone deployment modes with enterprise-grade security, monitoring, and scalability features.

## Architecture Overview

### System Components

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   React Frontend    │    │   WebSocket Bridge   │    │  Terminal Service   │
│   (Port 5173)       │◄──►│   (Port 8123)        │◄──►│   (Port 8002)       │
│                     │    │                      │    │                     │
│ • Portfolio UI      │    │ • VS Code Extension  │    │ • node-pty Sessions │
│ • Terminal Grid     │    │ • Message Routing    │    │ • Security Layer    │
│ • xterm.js Display  │    │ • Security Bridge    │    │ • Session Manager   │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Deployment Modes

1. **VS Code Enhanced Mode**: Full integration with VS Code extension
2. **Standalone Mode**: Independent terminal service without VS Code dependency
3. **Hybrid Mode**: Graceful fallback between VS Code and standalone modes

## Infrastructure Requirements

### Minimum Hardware Requirements

- **CPU**: 4 cores (8 cores recommended for production)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 20GB available space (SSD recommended)
- **Network**: 1Gbps connection for terminal streaming

### Software Dependencies

#### Core Requirements
```bash
# Node.js (LTS version)
node --version  # >= 18.0.0
npm --version   # >= 8.0.0

# Build tools (Windows)
npm install -g windows-build-tools
npm install -g node-gyp

# Process management
npm install -g pm2
```

#### System Libraries
```bash
# Windows
# Visual Studio Build Tools or Visual Studio Community
# Python 3.x (for node-gyp)

# Linux/macOS
build-essential
python3-dev
make
g++
```

### Network Configuration

#### Required Ports
- **5173**: React frontend (configurable)
- **8002**: Standalone terminal service 
- **8123**: VS Code WebSocket bridge (VS Code mode only)
- **3000-3099**: Project development servers (configurable)

#### Firewall Rules
```bash
# Windows Firewall
netsh advfirewall firewall add rule name="Claude Portfolio Frontend" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Claude Terminal Service" dir=in action=allow protocol=TCP localport=8002
netsh advfirewall firewall add rule name="Claude VS Code Bridge" dir=in action=allow protocol=TCP localport=8123

# Linux iptables
iptables -A INPUT -p tcp --dport 5173 -j ACCEPT
iptables -A INPUT -p tcp --dport 8002 -j ACCEPT
iptables -A INPUT -p tcp --dport 8123 -j ACCEPT
```

## Pre-Deployment Setup

### 1. Environment Preparation

```bash
# Clone repository
git clone <repository-url> claude-portfolio
cd claude-portfolio

# Install dependencies
npm install
cd vscode-extension/claude-portfolio
npm install
cd ../..
```

### 2. Configuration Files

#### Production Environment File
```env
# .env.production
NODE_ENV=production
VITE_APP_ENVIRONMENT=production
VITE_WEBSOCKET_URL=ws://localhost:8002
VITE_FALLBACK_WEBSOCKET_URL=ws://localhost:8123

# Security settings
TERMINAL_SESSION_TIMEOUT=30
MAX_CONCURRENT_SESSIONS=50
ENABLE_AUDIT_LOGGING=true
WORKSPACE_ROOT=/opt/claude-portfolio

# Performance settings
WS_HEARTBEAT_INTERVAL=30000
SESSION_CLEANUP_INTERVAL=300000
PORT_CHECK_INTERVAL=15000
```

#### Terminal Service Configuration
```json
// terminal-service-config.json
{
  "port": 8002,
  "host": "0.0.0.0",
  "workspaceRoot": "/opt/claude-portfolio",
  "maxSessions": 50,
  "sessionTimeout": 1800000,
  "enableSecurity": true,
  "allowedOrigins": [
    "http://localhost:5173",
    "https://your-domain.com"
  ],
  "security": {
    "enableCommandValidation": true,
    "enablePathSanitization": true,
    "maxCommandLength": 1000,
    "blockedPatterns": [
      "rm -rf /",
      "format c:",
      "shutdown",
      "reboot"
    ]
  },
  "logging": {
    "level": "info",
    "auditLog": "/var/log/claude-portfolio/audit.log",
    "errorLog": "/var/log/claude-portfolio/error.log"
  }
}
```

### 3. Build Process

```bash
# Production build
npm run build

# VS Code extension build
cd vscode-extension/claude-portfolio
npm run compile
npx vsce package

# Create distribution package
cd ../..
npm run package:production
```

## Deployment Procedures

### 1. Standalone Deployment (Recommended)

#### A. Service Installation
```bash
# Create service user
sudo useradd -r -s /bin/false claude-portfolio

# Create application directory
sudo mkdir -p /opt/claude-portfolio
sudo chown claude-portfolio:claude-portfolio /opt/claude-portfolio

# Copy application files
sudo cp -r dist/* /opt/claude-portfolio/
sudo chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio
```

#### B. Systemd Service Configuration
```ini
# /etc/systemd/system/claude-portfolio.service
[Unit]
Description=Claude Development Portfolio
After=network.target

[Service]
Type=simple
User=claude-portfolio
Group=claude-portfolio
WorkingDirectory=/opt/claude-portfolio
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

#### C. Start Services
```bash
# Enable and start services
sudo systemctl enable claude-portfolio
sudo systemctl start claude-portfolio

# Verify status
sudo systemctl status claude-portfolio
```

### 2. PM2 Deployment (Alternative)

#### A. PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'claude-portfolio-frontend',
    script: 'npm',
    args: 'run preview',
    cwd: '/opt/claude-portfolio',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5173
    }
  }, {
    name: 'claude-terminal-service',
    script: 'src/services/terminal-service/index.js',
    cwd: '/opt/claude-portfolio',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8002
    }
  }]
};
```

#### B. Deploy with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor applications
pm2 monit
```

### 3. Docker Deployment

#### A. Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S claude && \
    adduser -S claude -u 1001

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/services ./src/services

# Set permissions
RUN chown -R claude:claude /app
USER claude

EXPOSE 5173 8002

CMD ["node", "src/services/terminal-service/index.js"]
```

#### B. Docker Compose Configuration
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  claude-portfolio:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "5173:5173"
      - "8002:8002"
    environment:
      - NODE_ENV=production
      - WORKSPACE_ROOT=/app/workspace
    volumes:
      - workspace_data:/app/workspace
      - logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  reverse-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - claude-portfolio
    restart: unless-stopped

volumes:
  workspace_data:
  logs:
```

### 4. Load Balancer Configuration

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/claude-portfolio
upstream claude_frontend {
    server 127.0.0.1:5173;
    server 127.0.0.1:5174 backup;
}

upstream claude_terminal {
    server 127.0.0.1:8002;
    server 127.0.0.1:8003 backup;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Frontend
    location / {
        proxy_pass http://claude_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket terminals
    location /ws/ {
        proxy_pass http://claude_terminal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health checks
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Security Configuration

### 1. SSL/TLS Setup

```bash
# Generate SSL certificates (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Security Headers

```nginx
# Security headers in nginx config
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ws-src 'self'";
```

### 3. Process Isolation

```bash
# Create restricted user environment
sudo useradd -r -m -s /bin/bash claude-terminal
sudo usermod -aG docker claude-terminal

# Set resource limits
echo "claude-terminal soft nproc 100" | sudo tee -a /etc/security/limits.conf
echo "claude-terminal hard nproc 200" | sudo tee -a /etc/security/limits.conf
echo "claude-terminal soft nofile 1024" | sudo tee -a /etc/security/limits.conf
echo "claude-terminal hard nofile 2048" | sudo tee -a /etc/security/limits.conf
```

## Post-Deployment Validation

### 1. Service Health Checks

```bash
# Check service status
curl -f http://localhost:5173/health
curl -f http://localhost:8002/health

# WebSocket connectivity
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8002');
ws.on('open', () => { console.log('✅ WebSocket connected'); ws.close(); });
ws.on('error', (err) => { console.error('❌ WebSocket error:', err); });
"
```

### 2. Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:5173'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Terminal Creation"
    weight: 50
    engine: ws
    connect:
      ws: 'ws://localhost:8002'
    send:
      - json:
          type: 'create'
          workbranchId: 'test'
          shell: 'bash'
EOF

# Run load test
artillery run load-test.yml
```

### 3. Security Validation

```bash
# Port scan
nmap -sV localhost -p 5173,8002,8123

# SSL configuration test
testssl.sh your-domain.com

# Dependency audit
npm audit --audit-level moderate
```

## Backup and Recovery

### 1. Data Backup Strategy

```bash
#!/bin/bash
# backup-script.sh

BACKUP_DIR="/opt/backups/claude-portfolio"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup configuration files
cp -r /opt/claude-portfolio/config "$BACKUP_DIR/$DATE/"

# Backup workspace data
tar -czf "$BACKUP_DIR/$DATE/workspace.tar.gz" /opt/claude-portfolio/workspace/

# Backup logs (last 7 days)
find /var/log/claude-portfolio -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/$DATE/" \;

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR/$DATE"
```

### 2. Disaster Recovery Plan

#### A. Service Recovery
```bash
#!/bin/bash
# disaster-recovery.sh

# Stop all services
sudo systemctl stop claude-portfolio

# Restore from backup
BACKUP_DATE=$1
if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    exit 1
fi

BACKUP_PATH="/opt/backups/claude-portfolio/$BACKUP_DATE"

# Restore configuration
sudo cp -r "$BACKUP_PATH/config"/* /opt/claude-portfolio/config/

# Restore workspace
sudo tar -xzf "$BACKUP_PATH/workspace.tar.gz" -C /

# Fix permissions
sudo chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio

# Start services
sudo systemctl start claude-portfolio

echo "Recovery completed from backup: $BACKUP_DATE"
```

#### B. Database Recovery (if applicable)
```bash
# Restore session state (Redis)
redis-cli --rdb /opt/backups/claude-portfolio/redis-backup.rdb
```

## Troubleshooting Common Issues

### 1. Port Conflicts
```bash
# Find processes using ports
netstat -tulpn | grep :8002
lsof -i :8002

# Kill conflicting processes
sudo kill -9 $(lsof -t -i:8002)
```

### 2. Permission Issues
```bash
# Fix file permissions
sudo chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio
sudo chmod -R 755 /opt/claude-portfolio
sudo chmod -R 644 /opt/claude-portfolio/config/*
```

### 3. Memory Issues
```bash
# Monitor memory usage
ps aux | grep node | awk '{print $2, $4, $11}' | sort -k2 -nr

# Restart if memory usage is high
sudo systemctl restart claude-portfolio
```

### 4. WebSocket Connection Issues
```bash
# Check WebSocket server
ss -tlnp | grep :8002

# Test WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:8002/
```

## Update and Maintenance Procedures

### 1. Rolling Updates

```bash
#!/bin/bash
# rolling-update.sh

# Download new version
git pull origin main

# Build new version
npm run build

# Update PM2 applications
pm2 reload ecosystem.config.js

# Verify deployment
curl -f http://localhost:5173/health || {
    echo "Health check failed, rolling back..."
    pm2 reload ecosystem.config.js --force
    exit 1
}

echo "Rolling update completed successfully"
```

### 2. Scheduled Maintenance

```bash
# Crontab entries for maintenance
0 2 * * 0    /opt/claude-portfolio/scripts/weekly-maintenance.sh
0 3 * * *    /opt/claude-portfolio/scripts/backup-script.sh
*/15 * * * * /opt/claude-portfolio/scripts/health-check.sh
```

This production deployment guide provides a comprehensive foundation for deploying the Claude Development Portfolio's terminal system at enterprise scale with high reliability, security, and performance.