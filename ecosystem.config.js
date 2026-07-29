module.exports = {
    apps: [{
        name: 'quizer',
        script: 'npm',
        args: 'run dev',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        merge_logs: true
    }]
};