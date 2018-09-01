const program = require('commander');
const {spawn} = require('child_process');

const vhost = require('./src/vhost.js');
const commons = require('./src/commons');

program
    .version('0.1.0')
    .name('vhost-management')
    .option("--htdocs [path]", "Path to where each vhost should store per domain htdocs.", "/www")
    .option("--nginx [path]", "Path to nginx configuration files.", "/etc/nginx")
    .option("--reload", "Reload nginx after operation.", false)
;

program
    .command('add <domain>')
    .description('Add a new domain/subdomain to the vhosts')
    .option("--ssl", "Enable SSL")
    .option("--redirect-to-ssl", "Redirect http to https.", true)
    .option("--issue", "Issue a wildcard certificate", false)
    .option("--staging", "Issue a testing certificate", false)
    .option("--php", "Enable PHP support", false)
    .option("--enable", "Enable domain after vhost is created", false)
    .action(function (domain, options) {
        const opts = {
            ssl: options.ssl,
            redirectToSsl: options.redirectToSsl,
            staging: options.staging,
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
    .command('enable <domain>')
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
    .command('list')
    .description('List enabled vhosts')
    .action(function (options) {
        const opts = {
            nginx: options.parent.nginx,
        };

        vhost.listVhosts(opts);
    })
;

program
    .command('disable <domain>')
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
    .command('logrotate')
    .description('Rotate logs.')
    .option('-c,--config <file>', 'Logrotate config file to use.', '/etc/logrotate.d/nginx.conf')
    .option('-f,--force', 'Force log rotation', false)
    .action(function (opts) {
        console.log('Forcing log rotation using ' + opts.config);

        let options = [];

        if(opts.force) {
            options.push('-f')
        }

        options.push('-v');
        options.push(opts.config);

        const child = spawn('logrotate', options);
        commons.processOutput(child);
    })
;

program.on('command:*', function () {
    program.help();
});

program.parse(process.argv);
