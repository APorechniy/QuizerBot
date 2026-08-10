module.exports = {
    apps: [{
        name: 'quizer',
        script: 'npx',
        args: 'tsx src/index.ts',
        autorestart: true,
        watch: false,
        max_memory_restart: '500M'
    }]
};