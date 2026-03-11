/**
 * PM2 Ecosystem Config — GalasKomunikator
 *
 * Użycie na VPS:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup systemd
 */

module.exports = {
  apps: [
    {
      name: 'gk-backend',
      script: 'src/server.js',
      cwd: '/var/www/galas-komunikator/backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/pm2/gk-backend.err.log',
      out_file: '/var/log/pm2/gk-backend.out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'gk-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/galas-komunikator/frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/gk-frontend.err.log',
      out_file: '/var/log/pm2/gk-frontend.out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
