import { Container } from "../container";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
var tunnel = require("tunnel");
import * as fs from "fs";
import * as https from 'https';
import * as sslRootCas from 'ssl-root-cas';
import { SiteInfo } from "./authInfo";

export function getAgent(site?: SiteInfo): any {
    let agent = undefined;
    try {
        if (site) {
            if (site.customSSLCertPaths && site.customSSLCertPaths.trim() !== '') {
                const cas = sslRootCas.create();
                const certs = site.customSSLCertPaths.split(',');

                certs.forEach(cert => {
                    cas.addFile(cert.trim());
                });

                https.globalAgent.options.ca = cas;

                agent = new https.Agent({ rejectUnauthorized: false });
            } else if (site.pfxPath && site.pfxPath.trim() !== '') {
                const pfxFile = fs.readFileSync(site.pfxPath);

                agent = new https.Agent({
                    pfx: pfxFile,
                    passphrase: site.pfxPassphrase
                });
            }
        }

        if (!agent && configuration.get<boolean>('enableCharles')) {
            const debugOnly = configuration.get<boolean>('charlesDebugOnly');

            if (!debugOnly || (debugOnly && Container.isDebugging)) {
                let certPath = configuration.get<string>('charlesCertPath');
                if (!certPath || certPath.trim() === '') {
                    certPath = Resources.charlesCert;
                }

                let pemFile = fs.readFileSync(certPath);

                agent = tunnel.httpsOverHttp({
                    ca: [pemFile],
                    proxy: {
                        host: "127.0.0.1",
                        port: 8888
                    }
                });
            }
        }

    } catch (err) {
        agent = undefined;
    }

    return agent;
}