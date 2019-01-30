import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { window, Uri, commands } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { RefType } from '../typings/git';
import { CreatePRData, RepoData, CommitsResult } from '../ipc/prMessaging';
import { isCreatePullRequest, CreatePullRequest, isFetchDetails, FetchDetails } from '../ipc/prActions';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Commands } from '../commands';

export class PullRequestCreatorWebview extends AbstractReactWebview<CreatePRData | CommitsResult,Action> {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create pull request";
    }
    public get id(): string {
        return "createPullRequestScreen";
    }

    public async invalidate() {
        const state: RepoData[] = [];
        const repos = Container.bitbucketContext.getAllRepositores();
        for (let i = 0; i < repos.length; i++) {
            const r = repos[i];
            if (r.state.remotes.length === 0) {
                break;
            }

            const [, repo] = await Promise.all([r.fetch(), RepositoriesApi.get(r.state.remotes[0])]);
            const mainbranch = repo.mainbranch ? repo.mainbranch!.name : undefined;
            await state.push({
                uri: r.rootUri.toString(),
                href: repo.links!.html!.href,
                remotes: r.state.remotes,
                localBranches: await Promise.all(r.state.refs.filter(ref => ref.type === RefType.Head && ref.name).map(ref => r.getBranch(ref.name!))),
                remoteBranches: await Promise.all(
                    r.state.refs
                        .filter(ref => ref.type === RefType.RemoteHead && ref.name && r.state.remotes.find(rem => ref.name!.startsWith(rem.name)))
                        .map(ref => ({ ...ref, remote: r.state.remotes.find(rem => ref.name!.startsWith(rem.name))!.name }))
                ),
                mainbranch: mainbranch
            });
        }

        this.postMessage({type: 'createPullRequestData', repositories: state});
    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        await this.invalidate();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'fetchDetails': {
                    if (isFetchDetails(e)) {
                        handled = true;
                        this.fetchDetails(e).catch((e: any) => {
                            Logger.error(new Error(`error fetching details: ${e}`));
                        });
                    }
                    break;
                }
                case 'createPullRequest': {
                    if (isCreatePullRequest(e)) {
                        handled = true;
                        this.createPullRequest(e)
                            .catch((e: any) => {
                                Logger.error(new Error(`error creating pull request: ${e}`));
                                window.showErrorMessage('Pull request creation failed');
                            });
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async fetchDetails(fetchDetailsAction: FetchDetails) {
        const {remote, sourceBranch, destinationBranch} = fetchDetailsAction;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        const result = await RepositoriesApi.getCommitsForRefs(remote, sourceBranchName, destinationBranchName);
        this.postMessage({
            type: 'commitsResult',
            commits: result
        });
    }

    private async createPullRequest(createPullRequestAction: CreatePullRequest) {
        const {repoUri, remote, title, summary, sourceBranch, destinationBranch, pushLocalChanges} = createPullRequestAction;
        const repo = Container.bitbucketContext.getRepository(Uri.parse(repoUri))!;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        if (pushLocalChanges) {
            Logger.info(`pushing local changes for branch: ${sourceBranchName} to remote: ${remote.name} `);
            await repo.push(remote.name, sourceBranchName);
        }

        let pr: Bitbucket.Schema.Pullrequest = {
            type: 'pullrequest',
            title: title,
            summary: {
                raw: summary
            },
            source: {
                branch: {
                    name: sourceBranchName
                }
            },
            destination: {
                branch: {
                    name: destinationBranchName
                }
            }
        };

        const result = await PullRequestApi.create({repository: repo, remote: remote, data: pr});
        this.hide();
        commands.executeCommand(Commands.BitbucketShowPullRequestDetails, result);
    }
}
