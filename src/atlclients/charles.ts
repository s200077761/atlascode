import { Container } from "../container";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
var tunnel = require("tunnel");
import * as fs from "fs";
import * as https from 'https';
import * as sslRootCas from 'ssl-root-cas';

export function getAgent(): any {
    let agent = undefined;
    try {
        if (configuration.get<boolean>('enableCustomSSLCerts') && configuration.get<string>('customSSLCertPaths', undefined, '').trim() !== '') {
            const cas = sslRootCas.create();
            const certs = configuration.get<string>('customSSLCertPaths', undefined, '').split(',');

            certs.forEach(cert => {
                cas.addFile(cert.trim());
            });

            https.globalAgent.options.ca = cas;

            agent = new https.Agent({ rejectUnauthorized: false });

        } else if (configuration.get<boolean>('enableCharles')) {
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