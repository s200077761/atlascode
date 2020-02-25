import { window, commands } from 'vscode';
import { fileCheckoutEvent } from '../../analytics';
import { parseGitUrl, urlForRemote } from '../../bitbucket/bbUtils';
import { PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { Logger } from '../../logger';

export async function checkout(pr: PullRequest, branch: string): Promise<boolean> {
    if (!pr.workspaceRepo) {
        window.showInformationMessage(`Error checking out the pull request branch: no workspace repo`, `Dismiss`);
        Logger.error(new Error('error checking out the pull request branch: no workspace repo'));
        return false;
    }

    const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;

    if (pr.data.source.repo.url !== '' && pr.data.source.repo.url !== pr.data.destination.repo.url) {
        const parsed = parseGitUrl(urlForRemote(pr.workspaceRepo.mainSiteRemote.remote));
        const sourceRemote = {
            fetchUrl: parseGitUrl(pr.data.source.repo.url).toString(parsed.protocol),
            name: pr.data.source.repo.fullName,
            isReadOnly: true
        };

        await scm
            .getConfig(`remote.${sourceRemote.name}.url`)
            .then(async url => {
                if (!url) {
                    await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
                }
            })
            .catch(async _ => {
                await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
            });
        await scm.fetch(sourceRemote.name, pr.data.source.branchName);
    }

    return await scm
        .checkout(branch || pr.data.source.branchName)
        .then(() => {
            fileCheckoutEvent(pr.site.details).then(e => {
                Container.analyticsClient.sendTrackEvent(e);
            });
            return true;
        })
        .catch((e: any) => {
            if (e.stderr.includes('Your local changes to the following files would be overwritten by checkout')) {
                return window
                    .showInformationMessage(
                        `Checkout Failed: You have uncommitted changes`,
                        'Stash changes and try again',
                        'Dismiss'
                    )
                    .then(async userChoice => {
                        if (userChoice === 'Stash changes and try again') {
                            await commands.executeCommand('git.stash');
                            return await checkout(pr, branch);
                        } else {
                            return false;
                        }
                    });
            } else {
                window.showInformationMessage(`${e.stderr}`, `Dismiss`);
                return false;
            }
        });
}
