const {spawn} = require('child_process');
const commons = require('./commons');

module.exports = {
    issue: function (fqdm, opts = {staging: false}) {
        let acmeOptions = ['--dns', 'dns_cloudns', '--issue', '-d', fqdm, '-d', '*.' + fqdm, '--ocsp', '--force'];
        if (opts.staging) {
            acmeOptions.push('--staging')
        }
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawn('acme.sh', acmeOptions);
        commons.processOutput(child);
    },
    renew: function () {
        const acmeOptions = ['--renew-all'];
        console.log('acme.sh ' + acmeOptions.join(' '));
        const child = spawn('acme.sh', acmeOptions);
        commons.processOutput(child);
    }
};