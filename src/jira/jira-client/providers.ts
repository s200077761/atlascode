import { AuthorizationProvider, TransportFactory } from '@atlassianlabs/jira-pi-client';
import { AgentProvider, getProxyHostAndPort, shouldTunnelHost } from '@atlassianlabs/pi-client-common/agent';
import axios from 'axios';
import * as fs from "fs";
import * as https from 'https';
import * as sslRootCas from 'ssl-root-cas';
import { SiteInfo } from '../../atlclients/authInfo';
import { addCurlLogging } from "../../atlclients/interceptors";
import { configuration } from '../../config/configuration';
import { Container } from "../../container";
import { Resources } from '../../resources';
import { ConnectionTimeout } from "../../util/time";

var tunnel = require("tunnel");

export const jiraTransportFactory: TransportFactory = () => {
    const transport = axios.create({
        timeout: ConnectionTimeout,
        headers: {
            'X-Atlassian-Token': 'no-check',
            'x-atlassian-force-account-id': 'true',
            "Accept-Encoding": "gzip, deflate"
        }
    });

    if (Container.config.enableCurlLogging) {
        addCurlLogging(transport);
    }

    return transport;
};

export const jiraCloudAuthProvider = (token: string): AuthorizationProvider => {

    return (method: string, url: string) => {
        return Promise.resolve(`Bearer ${token}`);
    };
};

export const jiraServerAuthProvider = (username: string, password: string): AuthorizationProvider => {
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    return (method: string, url: string) => {
        return Promise.resolve(`Basic ${basicAuth}`);
    };
};

export const getAgent: AgentProvider = (site?: SiteInfo) => {
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
};
