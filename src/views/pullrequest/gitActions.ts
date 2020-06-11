import { window, commands } from 'vscode';
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

    await addSourceRemoteIfNeeded(pr);

    try {
        const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;
        await scm.checkout(branch || pr.data.source.branchName);
        if (scm.state.HEAD?.behind) {
            scm.pull();
        }
        return true;
    } catch (e) {
        if (e.stderr.includes('Your local changes to the following files would be overwritten by checkout')) {
            return window
                .showInformationMessage(
                    `Checkout Failed: You have uncommitted changes`,
                    'Stash changes and try again',
                    'Dismiss'
                )
                .then(async (userChoice) => {
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
    }
}

// Add source remote (if necessary) if pull request is from a fork repository
export async function addSourceRemoteIfNeeded(pr: PullRequest) {
    if (!pr.workspaceRepo) {
        return;
    }

    const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;

    if (pr.data.source.repo.url !== '' && pr.data.source.repo.url !== pr.data.destination.repo.url) {
        // Build the fork repo remote url based on the following:
        // 1) The source repo url from REST API returns http URLs, and we want to use SSH protocol if the existing remotes use SSH
        // 2) We build the source remote git url from the existing remote as the SSH url may be different from http url
        const parsed = parseGitUrl(urlForRemote(pr.workspaceRepo.mainSiteRemote.remote));
        const parsedSourceRemoteUrl = parseGitUrl(pr.data.source.repo.url);
        parsed.owner = parsedSourceRemoteUrl.owner;
        parsed.name = parsedSourceRemoteUrl.name;
        parsed.full_name = parsedSourceRemoteUrl.full_name;
        const sourceRemote = {
            fetchUrl: parsed.toString(parsed.protocol),
            // Bitbucket Server personal repositories are of the format `~username`
            // and `~` is an invalid character for git remotes
            name: pr.data.source.repo.fullName.replace('~', '__').toLowerCase(),
            isReadOnly: true,
        };

        await scm
            .getConfig(`remote.${sourceRemote.name}.url`)
            .then(async (url) => {
                if (!url) {
                    await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
                }
            })
            .catch(async (_) => {
                await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
            });

        await scm.fetch(sourceRemote.name, pr.data.source.branchName);
    }
}
