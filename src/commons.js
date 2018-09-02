const path = require('path');
const parser = require('tld-extract');
const fs = require("fs");
const readline = require('readline');
const {spawnSync} = require('child_process');

module.exports = {
    mkdirRecursive: function (dir) {
        dir.split(path.sep)
            .reduce(
                (currentPath, folder) => {
                    currentPath += folder + path.sep;
                    if (!fs.existsSync(currentPath)) {
                        fs.mkdirSync(currentPath);
                    }
                    return currentPath;
                }, ''
            );
    },
    reloadNginx: function(log = true) {
        if(log) {
            console.log("Reloading nginx...");
        }
        const child = spawnSync('nginx', ['-s', 'reload'], {stdio: 'inherit', shell: true});
        if (child.error || child.status > 0) {
            process.exit(1)
        }
    },
    processOutput: function (proc) {
        readline.createInterface({
            input: proc.stdout,
            terminal: false
        }).on('line', function (line) {
            console.log(line);
        });

        readline.createInterface({
            input: proc.stderr,
            terminal: false
        }).on('line', function (line) {
            console.log(line);
        });
    },
    parseGlobalOptions: function(options) {
        let opts = {
            htdocs: options.parent.htdocs || "/www",
            nginx: options.parent.nginx || "/etc/nginx",
            reload: options.parent.reload || false
        };

        opts.htdocs = opts.htdocs.replace(/\/$/, "");
        opts.nginx = opts.nginx.replace(/\/$/, "");

        return opts;
    },
    getDomain: function (url) {
        if (!url.match('^http')) {
            url = 'http://' + url;
        }

        try {
            return parser(url).domain;
        } catch (e) {
            console.error("Invalid domain '" + url + "'");
            throw e;
        }
    },
    getSubDomain: function (url) {
        if (!url.match('^http')) {
            url = 'http://' + url;
        }

        try {
            return parser(url).sub;
        } catch (e) {
            console.error("Invalid domain '" + url + "'");
            throw e;
        }
    }
};