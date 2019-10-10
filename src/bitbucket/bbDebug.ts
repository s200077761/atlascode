import vscode from 'vscode';
import { Container } from "../container";
import { OutputLevel } from "../config/model";
import { ProductBitbucket } from "../atlclients/authInfo";
import { urlForRemote, siteDetailsForRemote, parseGitUrl } from "./bbUtils";
import { Logger } from "../logger";

export function showBitbucketDebugInfo() {

    if (Container.config.outputLevel !== OutputLevel.Debug) {
        vscode.window.showInformationMessage('Set ouput level setting (atlascode.outputLevel) to debug and run the command again to view the information', 'Open settings')
            .then((userChoice) => {
                if (userChoice === 'Open settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings2');
                }
            });

        return;
    }

    const sites = Container.siteManager.getSitesAvailable(ProductBitbucket)
        .map(site => ({
            name: site.name,
            host: site.hostname,
            type: site.isCloud ? 'cloud' : 'server',
            mirrors: Container.bitbucketContext.getMirrors(site.hostname)
        }));

    const repos = Container.bitbucketContext.getAllRepositories()
        .map(repo => ({
            uri: repo.rootUri.toString(),
            remotes: repo.state.remotes
                .map(remote => ({
                    name: remote.name,
                    url: urlForRemote(remote),
                    host: parseGitUrl(urlForRemote(remote)).resource,
                    matchingBitbucketSite: siteDetailsForRemote(remote) ? siteDetailsForRemote(remote)!.name : 'Not found'
                })),
        }));

    Logger.show();
    Logger.debug(JSON.stringify(
        { bitbucketSites: sites, vscodeWorkspaceRepositories: repos },
        undefined,
        4
    ));
}