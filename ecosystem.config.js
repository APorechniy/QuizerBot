module.exports = {
    apps: [{
        name: 'quizer',
        script: 'npm',
        args: 'run dev',
        autorestart: true,
        watch: false,
        max_memory_restart: '500M'
    }]
};