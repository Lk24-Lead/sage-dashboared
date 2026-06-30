module.exports = {
  apps: [{
    name: 'sage-dashboard',
    script: '/root/.local/bin/uv',
    args: 'run server.py',
    cwd: '/home/sage_app',
    env_file: '.env',
    watch: false,
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 20,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
