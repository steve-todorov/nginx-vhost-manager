const {spawnSync} = require('child_process');

module.exports = {
    issue: async function (fqdm, opts = {staging: false}) {
        let acmeOptions = ['--dns', 'dns_cloudns', '--issue', '-d', fqdm, '-d', '*.' + fqdm, '--ocsp', '--force'];
        if (opts.staging) {
            acmeOptions.push('--staging')
        }
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawnSync('acme.sh', acmeOptions, {stdio: 'inherit', shell: true});
        if(child.error) {
            process.exit(1)
        }
    },
    renew: async function () {
        const acmeOptions = ['--renew-all'];
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawnSync('acme.sh', acmeOptions, {stdio: 'inherit', shell: true});
        if(child.error) {
            process.exit(1)
        }
    }
};