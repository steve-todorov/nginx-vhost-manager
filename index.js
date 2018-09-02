const program = require('commander');
const {spawnSync} = require('child_process');

const vhost = require('./src/vhost.js');
const letsencrypt = require('./src/letsencrypt');
const commons = require('./src/commons');

program
    .name('vhost-management').version("0.2.2", '-v, --version')
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
    .action(function (domain, options) {
        const opts = {
            ssl: options.ssl,
            issue: options.issue,
            redirectToSsl: options.redirectToSsl,
            staging: options.staging,
            force: options.force,
            php: options.php,
            enable: options.enable,
            htdocs: options.parent.htdocs,
            nginx: options.parent.nginx,
            reload: options.parent.reload
        };

        vhost.createVhost(domain, opts);
    })
;

program
    .command('enable <domain>').alias('e')
    .description('Enable domain')
    .action(function (domain, options) {
        const opts = {
            nginx: options.parent.nginx,
            reload: options.parent.reload
        };

        vhost.enableVhost(domain, opts);
    })
;

program
    .command('list').alias('l')
    .description('List enabled vhosts')
    .action(function (options) {
        const opts = {
            nginx: options.parent.nginx,
        };

        vhost.listVhosts(opts);
    })
;

program
    .command('disable <domain>').alias('d')
    .description('Disable domain')
    .action(function (domain, options) {
        const opts = {
            nginx: options.parent.nginx,
            reload: options.parent.reload
        };

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
    .action(function (domain, opts) {
        console.log('Renewing all issued certificates which are due...');
        letsencrypt.renew(opts);
    })
;

program
    .command('issue <domain>').alias('i')
    .description('Issue LetsEncrypt certificates')
    .option("-s,--staging", "Issue a testing certificate", false)
    .option("-f,--force", "Force issuing certificate", false)
    .action(function (domain, opts) {
        console.log('Issuing LetsEncrypt certificate for ' + domain + '...');
        letsencrypt.issue(domain, opts);

        if (opts.parent.reload) {
            commons.reloadNginx();
        }
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
