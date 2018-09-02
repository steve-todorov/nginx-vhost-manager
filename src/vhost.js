const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const commons = require('./commons');
const letsencrypt = require('./letsencrypt');

module.exports = {
    createVhost: function (fqdn, opts = {
        ssl: false,
        issue: false,
        staging: false,
        redirectToSsl: false,
        php: false,
        enable: false,
        htdocs: '/www',
        nginx: '/etc/nginx',
        reload: false
    }) {
        const domain = commons.getDomain(fqdn);
        const subdomain = commons.getSubDomain(fqdn);
        opts.nginx = opts.nginx.replace(/\/$/, "");
        opts.htdocs = opts.htdocs.replace(/\/$/, "");

        if (typeof domain === 'undefined') {
            console.error("Could not create vhost because domain is undefined!");
            process.exit(1);
        }

        if (subdomain !== "" && opts.ssl && opts.issue) {
            console.error("Issuing certificates for subdomains is unsupported - we are using wildcard domain certificates!");
            process.exit(1);
        }

        const vhostBasePath = opts.nginx + "/vhosts/" + domain;
        const vhostPath = vhostBasePath + "/" + fqdn + ".vhost";
        const vhostSSLPath = vhostBasePath + "/" + fqdn + ".vhost.ssl";
        const vhostSSLConfPath = vhostBasePath + "/ssl.conf";
        const vhostHtdocsPath = opts.htdocs + "/" + domain + "/" + fqdn;
        const vhostLogsPath = opts.nginx + "/logs/" + domain;

        const createPaths = [vhostBasePath, vhostHtdocsPath, vhostLogsPath];

        createPaths.forEach((v) => {
            console.log('Creating ' + v);
            commons.mkdirRecursive(v);
        });

        if (fs.existsSync(vhostSSLPath) || fs.existsSync(vhostPath)) {
            console.error(vhostSSLPath + " or " + vhostPath + " already exists! Aborting!!!");
            process.exit(1)
        }

        console.log("Generating " + vhostPath);
        this.generateVhostFile(fqdn, opts.nginx, opts.htdocs, false, opts.redirectToSsl);

        if (opts.ssl) {
            console.log("Generating " + vhostSSLPath);
            this.generateVhostFile(fqdn, opts.nginx, opts.htdocs, true, false);

            if (subdomain === "") {
                console.log("Generating " + vhostSSLConfPath);
                this.generateSSLConf(fqdn, opts.nginx);

                if(opts.issue)
                {
                    console.log('Issuing wildcard certificate for ' + fqdn);
                    letsencrypt.issue(fqdn, {staging: opts.staging, force: opts.force, reload: false});
                }
            }
        }

        if (opts.enable) {
            this.enableVhost(fqdn, opts);
        } else if(opts.reload) {
            commons.reloadNginx();
        }

    },
    generateVhostFile: function (fqdn, nginxPath, htdocsPath, ssl = false, redirectToSsl = false) {
        const domain = commons.getDomain(fqdn);

        let source;

        if (!ssl) {
            source = fs.readFileSync(path.join(__dirname, '../templates/vhost.template'), 'utf8');
        } else {
            source = fs.readFileSync(path.join(__dirname, '../templates/vhost.ssl.template'), 'utf8');
        }

        const template = handlebars.compile(source);

        const data = {
            "domain": domain,
            "fqdn": fqdn,
            "redirectToSsl": redirectToSsl,
            "htdocs": htdocsPath
        };

        const vhostBasePath = nginxPath + "/vhosts/" + domain;

        let savePath;
        if (!ssl) {
            savePath = vhostBasePath + "/" + fqdn + ".vhost";
        } else {
            savePath = vhostBasePath + "/" + fqdn + ".vhost.ssl";
        }

        fs.writeFileSync(savePath, template(data))
    },
    generateSSLConf: function (fqdn, nginxPath) {
        const domain = commons.getDomain(fqdn);

        let source = fs.readFileSync(path.join(__dirname, '../templates/ssl-common.template'), 'utf8');

        const template = handlebars.compile(source);

        const vhostBasePath = nginxPath + "/vhosts/" + domain;
        const savePath = vhostBasePath + "/ssl.conf";

        fs.writeFileSync(savePath, template({"fqdn": fqdn}))

    },
    enableVhost: function (fqdn, opts = {nginx: '/etc/nginx', reload: false}) {
        opts.nginx = opts.nginx.replace(/\/$/, "");

        const domain = commons.getDomain(fqdn);
        const vhostBasePath = opts.nginx + "/vhosts/" + domain;
        const vhostFile = fqdn + ".vhost";
        const vhostSSLFile = fqdn + ".vhost.ssl";
        const vhostPath = vhostBasePath + "/" + vhostFile;
        const vhostSSLPath = vhostBasePath + "/" + vhostSSLFile;
        const vhostEnabledPath = opts.nginx + "/enabled";

        if (!fs.existsSync(vhostEnabledPath)) {
            console.log('Creating ' + vhostEnabledPath);
            commons.mkdirRecursive(vhostEnabledPath);
        }

        if (!fs.existsSync(vhostPath) && !fs.existsSync(vhostSSLPath)) {
            console.error("Could not find none of the following files in " + vhostBasePath + "!");
            console.error("  " + vhostPath);
            console.error("  " + vhostSSLPath);
            console.error("Aborting!");

            process.exit(1)
        }

        if (fs.existsSync(vhostPath)) {
            const relativePath = path.relative(vhostEnabledPath, vhostPath);
            console.log('Symlinking ' + vhostPath + ' => ' + vhostEnabledPath);
            if (fs.existsSync(vhostEnabledPath + "/" + vhostFile)) {
                fs.unlinkSync(vhostEnabledPath + "/" + vhostFile);
            }
            fs.symlinkSync(relativePath, vhostEnabledPath + '/' + vhostFile)
        }

        if (fs.existsSync(vhostSSLPath)) {
            const relativePath = path.relative(vhostEnabledPath, vhostSSLPath);
            console.log('Symlinking ' + vhostSSLPath + ' => ' + vhostEnabledPath);
            if (fs.existsSync(vhostEnabledPath + "/" + vhostSSLFile)) {
                fs.unlinkSync(vhostEnabledPath + "/" + vhostSSLFile);
            }
            fs.symlinkSync(relativePath, vhostEnabledPath + '/' + vhostSSLFile)
        }

        if (opts.reload) {
            commons.reloadNginx(true);
        }

    },
    disableVhost: function (fqdn, opts = {nginx: '/etc/nginx', reload: false}) {
        opts.nginx = opts.nginx.replace(/\/$/, "");
        const vhostPath = opts.nginx + "/enabled/" + fqdn + ".vhost";
        const vhostSSLPath = opts.nginx + "/enabled/" + fqdn + ".vhost.ssl";

        if (!fs.existsSync(vhostPath) && !fs.existsSync(vhostSSLPath)) {
            console.error("Could not find none of the following files in " + opts.nginx + "/enabled/" + ":");
            console.error("  - " + vhostPath);
            console.error("  - " + vhostSSLPath);
            console.error("Aborting!");

            process.exit(1)
        }

        if (fs.existsSync(vhostPath)) {
            console.log('Removing ' + vhostPath);
            fs.unlinkSync(vhostPath);
        }

        if (fs.existsSync(vhostSSLPath)) {
            console.log('Removing ' + vhostSSLPath);
            fs.unlinkSync(vhostSSLPath);
        }

        if (opts.reload) {
            commons.reloadNginx(true);
        }
    },
    listVhosts: function (opts = {nginx: '/etc/nginx'}) {
        const vhostPath = opts.nginx.replace(/\/$/, "") + "/enabled/";

        console.log('Searching for enabled domains in ' + vhostPath + "...");
        if (fs.existsSync(vhostPath)) {
            let dirCont = fs.readdirSync(vhostPath);

            let files = dirCont.filter(function (elm) {
                return elm.match(/.*\.vhost(\.ssl)?/ig);
            });

            if(files.length > 0) {
                let sorted_hosts = [];
                let split_hosts = [];

                for (f in files) {
                    let segments = files[f].split('.');
                    segments.reverse();
                    split_hosts.push(segments);
                }

                split_hosts.sort();

                for (h in split_hosts) {
                    split_hosts[h].reverse();
                    sorted_hosts.push(split_hosts[h].join("."))
                }

                sorted_hosts.forEach((d) => console.log(' - ' + d))
            } else {
                console.log('No enabled domains have been found.');
            }

        } else {
            console.error("Path " + vhostPath + " does not exist or is not accessible (permissions issue maybe?).");
        }
    }
};