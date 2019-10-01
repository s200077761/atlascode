import { AbstractReactWebview } from './abstractWebview';
import { Action, onlineStatus } from '../ipc/messaging';
import { Uri, commands } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { RefType, Repository, Remote, Branch } from '../typings/git';
import { RepoData, FileDiff, FileStatus } from '../ipc/prMessaging';
import { isCreatePullRequest, CreatePullRequest, isFetchDetails, FetchDetails, isFetchIssue, FetchIssue, isFetchUsers } from '../ipc/prActions';
import { Commands } from '../commands';
import { PullRequest, BitbucketIssueData } from '../bitbucket/model';
import { prCreatedEvent } from '../analytics';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { ProductJira, DetailedSiteInfo } from '../atlclients/authInfo';
import { parseBitbucketIssueKeys } from '../bitbucket/bbIssueKeyParser';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { isOpenBitbucketIssueAction, isUpdateDiffAction } from '../ipc/bitbucketIssueActions';
import { siteDetailsForRemote, clientForRemote, firstBitbucketRemote } from '../bitbucket/bbUtils';
import { MinimalIssue, isMinimalIssue } from '../jira/jira-client/model/entities';
import { showIssue } from '../commands/jira/showIssue';
import { transitionIssue } from '../jira/transitionIssue';
import { issueForKey } from '../jira/issueForKey';
import { Shell } from '../util/shell';
import * as vscode from 'vscode';

export class PullRequestCreatorWebview extends AbstractReactWebview {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create pull request";
    }
    public get id(): string {
        return "createPullRequestScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        const repos = Container.bitbucketContext.getBitbucketRepositories();
        if (repos.length > 0) {
            return siteDetailsForRemote(firstBitbucketRemote(repos[0]));
        }

        return undefined;
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
        Container.pmfStats.touchActivity();
    }

    async updateFields() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const repos = Container.bitbucketContext.getBitbucketRepositories();

            const state: RepoData[] = await Promise.all(repos.map(async r => {

                // TODO [VSCODE-567] Capture remote in PullRequestCreatorWebview state
                const remote = firstBitbucketRemote(r);

                const bbApi = await clientForRemote(remote);
                const [, repo, developmentBranch, defaultReviewers] = await Promise.all([
                    r.fetch(),
                    bbApi.repositories.get(remote),
                    bbApi.repositories.getDevelopmentBranch(remote),
                    bbApi.pullrequests.getReviewers(remote)
                ]);

                const currentUser = { accountId: (siteDetailsForRemote(remote)!).userId };

                return {
                    uri: r.rootUri.toString(),
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    name: repo.displayName,
                    owner: repo.name,
                    remotes: r.state.remotes,
                    defaultReviewers: defaultReviewers.filter(reviewer => reviewer.accountId !== currentUser.accountId),
                    localBranches: r.state.refs.filter(ref => ref.type === RefType.Head && ref.name),
                    remoteBranches: r.state.refs
                        .filter(ref => ref.type === RefType.RemoteHead && ref.name && r.state.remotes.find(rem => ref.name!.startsWith(rem.name)))
                        .map(ref => ({ ...ref, remote: r.state.remotes.find(rem => ref.name!.startsWith(rem.name))!.name })),
                    branchTypes: [],
                    developmentBranch: developmentBranch,
                    hasLocalChanges: r.state.workingTreeChanges.length + r.state.indexChanges.length + r.state.mergeChanges.length > 0,
                    isCloud: siteDetailsForRemote(remote)!.isCloud
                };
            }));

            this.postMessage({ type: 'createPullRequestData', repositories: state });
        } catch (e) {
            Logger.error(new Error(`error fetching PR form: ${e}`));
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }

    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        await this.invalidate();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refreshPR': {
                    handled = true;
                    this.invalidate();
                    break;
                }
                case 'fetchDetails': {
                    if (isFetchDetails(e)) {
                        handled = true;
                        try {
                            await this.fetchDetails(e);
                        } catch (e) {
                            Logger.error(new Error(`error fetching details: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'fetchIssue': {
                    if (isFetchIssue(e)) {
                        handled = true;
                        try {
                            await this.fetchIssueForBranch(e);
                        } catch (e) {
                            Logger.error(new Error(`error fetching issue: ${e}`));
                            // ignore error. do not send it to webview.
                        }
                    }
                    break;
                }
                case 'fetchUsers': {
                    if (isFetchUsers(e)) {
                        handled = true;
                        try {
                            const bbApi = await clientForRemote(e.remote);
                            const reviewers = await bbApi.pullrequests.getReviewers(e.remote, e.query);
                            this.postMessage({ type: 'fetchUsersResult', users: reviewers, nonce: e.nonce });
                        } catch (e) {
                            Logger.error(new Error(`error fetching reviewers: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        showIssue(e.issueOrKey);
                        break;
                    }
                }
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        commands.executeCommand(Commands.ShowBitbucketIssue, e.issue);
                    }
                    break;
                }
                case 'updateDiff': {
                    if(isUpdateDiffAction(e)){
                        let fileDiffs: FileDiff[] = await this.generateDiff(e.repoData, e.destinationBranch, e.sourceBranch);

                        this.postMessage({type: 'diffResult', fileDiffs: fileDiffs});
                    }
                    break;
                }
                case 'createPullRequest': {
                    if (isCreatePullRequest(e)) {
                        handled = true;
                        try {
                            await this.createPullRequest(e);
                        } catch (e) {
                            Logger.error(new Error(`error creating pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async fetchDetails(fetchDetailsAction: FetchDetails) {
        const { remote, sourceBranch, destinationBranch } = fetchDetailsAction;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        const bbApi = await clientForRemote(remote);
        const result = await bbApi.repositories.getCommitsForRefs(remote, sourceBranchName, destinationBranchName);
        this.postMessage({
            type: 'commitsResult',
            commits: result
        });
    }

    async getCurrentRepo(repoData: RepoData): Promise<Repository> {
        const repos = Container.bitbucketContext.getBitbucketRepositories();

        const currentRepo: Repository | undefined = repos.find(r => r.rootUri.toString() === repoData.uri);
        if(currentRepo) {
            return currentRepo;
        } else {
            return Promise.reject(new Error('Could not match repoData object to local repository'));
        }
    }

    async findForkPoint(repoData: RepoData, sourceBranch: Branch, destinationBranch: Branch): Promise<string> {
        const repo: Repository = await this.getCurrentRepo(repoData);

        //When fetching the destination branch, we need to slice the remote off the branch name because the branch isn't actually called {remoteName}/{branchName}
        await repo.fetch(destinationBranch.remote, destinationBranch.name!.slice(destinationBranch.remote!.length + 1));
        const commonCommit = await repo.getMergeBase(destinationBranch.name!, sourceBranch.name!);
        return commonCommit;
    }

    async generateDiff(repo: RepoData, destinationBranch: Branch, sourceBranch: Branch): Promise<FileDiff[]> {
        const shell = new Shell(vscode.Uri.parse(repo.uri).fsPath);
        
        const forkPoint = await this.findForkPoint(repo, sourceBranch, destinationBranch);

        //Using git diff --numstat will generate lines in the format '{lines added}      {lines removed}     {name of file}'
        //We want to seperate each line and extract this data so we can create a file diff
        const diffOutputLines = await shell.lines(`git diff --numstat ${forkPoint} ${sourceBranch.commit}`);

        if(diffOutputLines.length === 0){
            return [];
        }

        //The bitbucket website also provides a status for each file (modified, added, deleted, etc.), so we need to get this info too.
        //git diff-index --name-status will return lines in the form {status}        {name of file}
        //It's important to note that the order of the files will be identical to git diff --numstat, and we can use that to our advantage
        const statusOutputLines = await shell.lines(`git diff --name-status ${forkPoint} ${sourceBranch.commit}`);

        let fileDiffs: FileDiff[] = [];
        for(let i = 0; i < diffOutputLines.length; i++){
            const wordsInLine = diffOutputLines[i].split(/\s+/);
            fileDiffs.push({linesAdded: +wordsInLine[0], linesRemoved: +wordsInLine[1], file: wordsInLine[2], status: (statusOutputLines[i].slice(0, 1) as FileStatus)});
        }

        return fileDiffs;
    }

    async fetchIssueForBranch(e: FetchIssue) {
        let issue: MinimalIssue | BitbucketIssueData | undefined = undefined;
        if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            const jiraIssueKeys = parseJiraIssueKeys(e.sourceBranch.name!);

            if (jiraIssueKeys.length > 0) {
                try {
                    issue = await issueForKey(jiraIssueKeys[0]);
                } catch (e) {
                    //not found
                }
            }

            if (!issue) {
                const bbIssueKeys = parseBitbucketIssueKeys(e.sourceBranch.name);
                if (bbIssueKeys.length > 0) {
                    const repo = Container.bitbucketContext.getRepository(Uri.parse(e.repoUri))!;
                    const remote = firstBitbucketRemote(repo);
                    const bbApi = await clientForRemote(remote);
                    const bbIssues = await bbApi.issues!.getIssuesForKeys(Container.bitbucketContext.getRepository(Uri.parse(e.repoUri))!, [bbIssueKeys[0]]);
                    if (bbIssues.length > 0) {
                        issue = bbIssues[0].data;
                    }
                }
            }

            this.postMessage({
                type: 'fetchIssueResult',
                issue: issue
            });
        }
    }

    private async updateIssue(repo: Repository, remote: Remote, issue?: MinimalIssue | BitbucketIssueData) {
        if (!issue) {
            return;
        }
        if (isMinimalIssue(issue)) {
            const transition = issue.transitions.find(t => t.to.id === issue.status.id);
            if (transition) {
                await transitionIssue(issue, transition);
            }
        } else {
            const bbApi = await clientForRemote(remote);
            await bbApi.issues!.postChange({ repository: repo, remote: remote, data: issue }, issue.state!);
        }
    }

    private async createPullRequest(createPullRequestAction: CreatePullRequest) {
        const { repoUri, remote, reviewers, title, summary, sourceBranch, destinationBranch, pushLocalChanges, closeSourceBranch, issue } = createPullRequestAction;
        const repo = Container.bitbucketContext.getRepository(Uri.parse(repoUri))!;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(remote.name + '/', '');

        if (pushLocalChanges) {
            Logger.info(`pushing local changes for branch: ${sourceBranchName} to remote: ${remote.name} `);
            await repo.push(remote.name, sourceBranchName);
        }

        const bbApi = await clientForRemote(remote);

        await bbApi.pullrequests
            .create(
                repo,
                remote,
                {
                    title: title,
                    summary: summary,
                    sourceBranchName: sourceBranchName,
                    destinationBranchName: destinationBranchName,
                    closeSourceBranch: closeSourceBranch,
                    reviewerAccountIds: reviewers.map(reviewer => reviewer.accountId)
                }
            )
            .then(async (pr: PullRequest) => {
                commands.executeCommand(Commands.BitbucketShowPullRequestDetails, pr);
                commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                const site: DetailedSiteInfo | undefined = siteDetailsForRemote(remote);
                if (site) {
                    prCreatedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                }
            });

        await this.updateIssue(repo, remote, issue);
        this.hide();
    }
}
