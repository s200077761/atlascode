import { BitbucketApi, BitbucketSite } from 'src/bitbucket/model';
import { commands, QuickPickItem, window } from 'vscode';
import { bitbucketSiteForRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { PipelineReferenceTarget, PipelineReferenceType, PipelineTargetType } from '../../pipelines/model';
import { Remote } from '../../typings/git';

interface QuickPickRemote extends QuickPickItem {
    remote: Remote;
}

export async function runPipeline() {
    const remoteQuickPicks = fetchRemotes();
    if (remoteQuickPicks.length === 0) {
        window.showErrorMessage(`There are no remotes available to build`);
    } else if (remoteQuickPicks.length === 1) {
        showBranchPicker(remoteQuickPicks[0].remote);
    } else {
        window
            .showQuickPick<QuickPickRemote>(remoteQuickPicks, {
                matchOnDescription: true,
                placeHolder: 'Select remote'
            })
            .then((quickPickRemote: QuickPickRemote | undefined) => {
                if (quickPickRemote) {
                    showBranchPicker(quickPickRemote.remote);
                }
            });
    }
}

async function showBranchPicker(remote: Remote) {
    const bbSite = bitbucketSiteForRemote(remote); // maybe undefined
    const site = siteDetailsForRemote(remote);
    const bbApi = await Container.clientManager.bbClient(site!);
    window
        .showQuickPick<QuickPickItem>(fetchBranches(bbApi, bbSite!), {
            matchOnDescription: true,
            placeHolder: 'Search for branch'
        })
        .then(async (quickPickItem: QuickPickItem | undefined) => {
            if (quickPickItem) {
                const branchName = quickPickItem.label;
                const target: PipelineReferenceTarget = {
                    type: PipelineTargetType.Reference,
                    ref_name: branchName,
                    ref_type: PipelineReferenceType.Branch
                };
                try {
                    await bbApi.pipelines!.triggerPipeline(bbSite!, target);
                } catch (e) {
                    Logger.error(e);
                    window.showErrorMessage(`Error building branch`);
                }
                // Seems like there's a bit of lag between a build starting and it showing up in the list API.
                setTimeout(() => {
                    commands.executeCommand(Commands.RefreshPipelines);
                }, 500);
            }
        });
}

async function fetchBranches(bbApi: BitbucketApi, bbSite: BitbucketSite): Promise<QuickPickItem[]> {
    const branches = await bbApi.repositories.getBranches(bbSite);
    return branches.map(branchName => {
        return {
            label: branchName
        };
    });
}

function fetchRemotes(): QuickPickRemote[] {
    const repos = Container.bitbucketContext.getBitbucketCloudRepositories();
    const remotes = repos.map(repo => repo.mainSiteRemote.remote);
    return remotes.map(remote => {
        return {
            remote: remote,
            label: remote.name
        };
    });
}
