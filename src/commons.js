const path = require('path');
const parser = require('tld-extract');
const fs = require("fs");
const readline = require('readline');
const {spawn} = require('child_process');

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
        const child = spawn('nginx', ['-s', 'reload']);
        this.processOutput(child);
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