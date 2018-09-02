const program = require('commander');
const {spawnSync} = require('child_process');

const vhost = require('./src/vhost.js');
const letsencrypt = require('./src/letsencrypt');
const commons = require('./src/commons');

program
    .name('vhost-management').version("0.2.3", '-v, --version')
    .option("--htdocs [path]", "Path to where each vhost should store per domain htdocs.", "/www")
    .option("--nginx [path]", "Path to nginx configuration files.", "/etc/nginx")
    .option("--reload", "Reload nginx after operation.", false)
;

program
    .command('add <domain>').alias('a')
    .description('Add a new domain/subdomain to the vhosts')
    .option("-s,--ssl", "Enable SSL")
    .option("-t,--staging", "Issue a testing certificate", false)
    .option("-r,--redirect-to-ssl", "Redirect http to https.", true)
    .option("-i,--issue", "Issue a wildcard certificate", false)
    .option("-p,--php", "Enable PHP support", false)
    .option("-e,--enable", "Enable domain after vhost is created", false)
    .option("-f,--force", "Force certificate issuing", false)
    .action(function (domain, options) {
        const opts = {
            ssl: options.ssl || false,
            issue: options.issue || false,
            redirectToSsl: options.redirectToSsl || true,
            staging: options.staging || false,
            force: options.force || false,
            php: options.php || false,
            enable: options.enable || false,
            ...commons.parseGlobalOptions(options)
        };

        vhost.createVhost(domain, opts);
    })
;

program
    .command('enable <domain>').alias('e')
    .description('Enable domain')
    .action(function (domain, options) {
        const opts = commons.parseGlobalOptions(options);
        vhost.enableVhost(domain, opts);
    })
;

program
    .command('list').alias('l')
    .description('List enabled vhosts')
    .action(function (options) {
        const opts = commons.parseGlobalOptions(options);
        vhost.listVhosts(opts);
    })
;

program
    .command('disable <domain>').alias('d')
    .description('Disable domain')
    .action(function (domain, options) {
        const opts = commons.parseGlobalOptions(options);
        vhost.disableVhost(domain, opts);
    })
;

program
    .command('logrotate').alias('lr')
    .description('Rotate all domain logs.')
    .option('-c,--config <file>', 'Logrotate config file to use.', '/etc/logrotate.d/nginx.conf')
    .option('-f,--force', 'Force log rotation', false)
    .action(function (opts) {
        console.log('Forcing log rotation using ' + opts.config);

        let options = [];

        if (opts.force) {
            options.push('-f')
        }

        options.push('-v');
        options.push(opts.config);

        const child = spawnSync('logrotate', options, {stdio: 'inherit', shell: true});
        if (child.error) {
            process.exit(1)
        }
    })
;

program
    .command('renew').alias('r')
    .description('Renew all LetsEncrypt certificates that are due.')
    .option("-s,--staging", "Issue a testing certificate", false)
    .option("-f,--force", "Force issuing certificate", false)
    .action(function (domain, options) {
        const opts = {
            staging: options.staging || false,
            force: options.force || false,
            ...commons.parseGlobalOptions(options)
        };

        console.log('Renewing all issued certificates which are due...');
        letsencrypt.renew(opts);
    })
;

program
    .command('issue <domain>').alias('i')
    .description('Issue LetsEncrypt certificates')
    .option("-s,--staging", "Issue a testing certificate", false)
    .option("-f,--force", "Force issuing certificate", false)
    .action(function (domain, options) {
        const opts = {
            staging: options.staging || false,
            force: options.force || false,
            ...commons.parseGlobalOptions(options)
        };

        console.log('Issuing LetsEncrypt certificate for ' + domain + '...');
        letsencrypt.issue(domain, opts);
    })
;

if (process.argv.length <= 2) {
    program.help();
}

// Error on uknown commands
program.on('command:*', function () {
    program.help()
});

program.parse(process.argv);
