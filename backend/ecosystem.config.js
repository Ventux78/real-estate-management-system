module.exports = {
  apps: [
    {
      name: 'gayrimenkul-backend',
      script: './dist/server.js',
      instances: 'max', // Use maximum number of CPUs available
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
