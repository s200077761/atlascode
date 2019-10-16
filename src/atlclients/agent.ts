import { Container } from "../container";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
var tunnel = require("tunnel");
import * as fs from "fs";
import * as https from 'https';
import * as sslRootCas from 'ssl-root-cas';
import { SiteInfo } from "./authInfo";

export function getAgent(site?: SiteInfo): { [k: string]: any } {
    let agent = {};
    try {
        if (site) {
            if (site.customSSLCertPaths && site.customSSLCertPaths.trim() !== '') {
                const cas = sslRootCas.create();
                const certs = site.customSSLCertPaths.split(',');

                certs.forEach(cert => {
                    cas.addFile(cert.trim());
                });

                https.globalAgent.options.ca = cas;

                agent = { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
            } else if (site.pfxPath && site.pfxPath.trim() !== '') {
                const pfxFile = fs.readFileSync(site.pfxPath);

                agent = {
                    httpsAgent: new https.Agent({
                        pfx: pfxFile,
                        passphrase: site.pfxPassphrase
                    })
                };
            }
        }

        if (!agent['httpsAgent']) {
            if (configuration.get<boolean>('enableHttpsTunnel')) {
                let shouldTunnel: boolean = true;
                if (site) {
                    shouldTunnel = shouldTunnelHost(site.hostname);
                }

                if (shouldTunnel) {
                    const [host, port] = getProxyHostAndPort();

                    let numPort = undefined;
                    if (host.trim() !== '') {
                        if (port.trim() !== '') {
                            numPort = parseInt(port);
                        }
                        agent = {
                            httpsAgent: tunnel.httpsOverHttp({
                                proxy: {
                                    host: host,
                                    port: numPort
                                }
                            }), proxy: false
                        };
                    }
                }

            } else {
                const useCharles = configuration.get<boolean>('enableCharles');
                if (useCharles) {
                    const debugOnly = configuration.get<boolean>('charlesDebugOnly');

                    if (!debugOnly || (debugOnly && Container.isDebugging)) {
                        let certPath = configuration.get<string>('charlesCertPath');
                        if (!certPath || certPath.trim() === '') {
                            certPath = Resources.charlesCert;
                        }

                        let pemFile = fs.readFileSync(certPath);

                        agent = {
                            httpsAgent: tunnel.httpsOverHttp({
                                ca: [pemFile],
                                proxy: {
                                    host: "127.0.0.1",
                                    port: 8888
                                }
                            })
                        };
                    }
                }
            }
        }

    } catch (err) {
        agent = {};
    }

    return agent;
}

export function getProxyHostAndPort(): [string, string] {
    const proxyEnv = 'https_proxy';
    const proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
    if (proxyUrl) {
        try {
            const parsedProxyUrl = new URL(proxyUrl);
            return [parsedProxyUrl.hostname, parsedProxyUrl.port];
        } catch (parseErr) {
            //ignore
        }
    }

    return ['', ''];
}

export function getProxyIgnores(): string[] {
    const proxyEnv = 'no_proxy';
    const proxyUrls = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
    if (proxyUrls) {
        return proxyUrls.split(',');
    }

    return [];
}

function shouldTunnelHost(hostname: string): boolean {
    /*
    we follow these rules:
        - NO_PROXY is a comma-separated list of hostnames and domains.
        - A hostname (e.g., mail, company.com, www.company.com) matches only that one hostname.
        - A domain starts with a . (e.g., .company.com) and matches all hostnames in that domain, including the hostname equal to the domain (e.g., .company.com matches company.com, www.company.com, mail.company.com).
    */
    const ignores = getProxyIgnores();
    for (let ignore of ignores) {
        if (ignore.startsWith('.')) {
            const domain = ignore.substr(1);
            if (hostname.includes(domain)) {
                return false;
            }
        } else {
            if (hostname.split(':')[0] === ignore) {
                return false;
            }


        }
    }

    return true;
}