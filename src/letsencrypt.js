const {spawnSync} = require('child_process');

module.exports = {
    issue: function (fqdm, opts = {staging: false, force: false, reload: false}) {
        let acmeOptions = ['--dns', 'dns_cloudns', '--issue', '-d', fqdm, '-d', '*.' + fqdm, '--ocsp'];
        if (opts.staging) {
            acmeOptions.push('--staging')
        }
        if (opts.force) {
            acmeOptions.push('--force')
        }
        if (!opts.staging && opts.reload) {
            acmeOptions.push('--renew-hook', "'nginx -s reload'")
        }
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawnSync('acme.sh', acmeOptions, {stdio: 'inherit', shell: true});
        if (child.error || child.status > 0) {
            process.exit(1)
        }
    },
    renew: function (opts = {staging: false, force: false, reload: false}) {
        let acmeOptions = ['--renew-all'];
        if (opts.staging) {
            acmeOptions.push('--staging')
        }
        if (opts.force) {
            acmeOptions.push('--force')
        }
        if (!opts.staging && opts.reload) {
            acmeOptions.push('--renew-hook', "'nginx -s reload'")
        }
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawnSync('acme.sh', acmeOptions, {stdio: 'inherit', shell: true});
        if (child.error || child.status > 0) {
            process.exit(1)
        }
    }
};