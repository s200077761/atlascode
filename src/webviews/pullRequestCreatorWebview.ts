import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';
import { commands, Uri } from 'vscode';
import { prCreatedEvent, Registry, viewScreenEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { parseBitbucketIssueKeys } from '../bitbucket/bbIssueKeyParser';
import { clientForSite } from '../bitbucket/bbUtils';
import {
    BitbucketIssue,
    BitbucketSite,
    Commit,
    FileDiff,
    FileStatus,
    isBitbucketIssue,
    PullRequest,
    User,
} from '../bitbucket/model';
import { Commands } from '../commands';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { isOpenBitbucketIssueAction, isUpdateDiffAction } from '../ipc/bitbucketIssueActions';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import {
    CreatePullRequest,
    FetchDetails,
    FetchIssue,
    isCreatePullRequest,
    isFetchDefaultReviewers,
    isFetchDetails,
    isFetchIssue,
    isFetchUsers,
    isOpenDiffPreview,
} from '../ipc/prActions';
import { RepoData } from '../ipc/prMessaging';
import { issueForKey } from '../jira/issueForKey';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { iconSet, Resources } from '../resources';
import { Branch, Commit as GitCommit, Ref, RefType, Repository } from '../typings/git';
import { Shell } from '../util/shell';
import { FileDiffQueryParams } from '../views/pullrequest/pullRequestNode';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';
import { AbstractReactWebview } from './abstractWebview';

export class PullRequestCreatorWebview extends AbstractReactWebview {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return 'Create pull request';
    }
    public get id(): string {
        return 'createPullRequestScreen';
    }

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.PULLREQUEST);
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        const repos = Container.bitbucketContext.getBitbucketRepositories();
        if (repos.length > 0) {
            return repos[0].mainSiteRemote.site!.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
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

            const state: RepoData[] = await Promise.all(
                repos.map(async (wsRepo) => {
                    const site = wsRepo.mainSiteRemote.site!;
                    const bbApi = await clientForSite(site);
                    const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

                    const [, repo, developmentBranch] = await Promise.all([
                        scm.fetch(),
                        bbApi.repositories.get(site),
                        bbApi.repositories.getDevelopmentBranch(site),
                    ]);

                    let parentBranches: Ref[] = [];
                    const parentRemoteName = `${repo.parentFullName} (parent repo)`;
                    if (repo.parentFullName && !wsRepo.siteRemotes.some((s) => s.remote.name === parentRemoteName)) {
                        const parentSite: BitbucketSite = {
                            ...site,
                            ownerSlug: repo.parentFullName.slice(0, repo.parentFullName.lastIndexOf('/')),
                            repoSlug: repo.parentFullName.slice(repo.parentFullName.lastIndexOf('/') + 1),
                        };

                        wsRepo.siteRemotes.push({
                            remote: { name: parentRemoteName, fetchUrl: '', isReadOnly: true },
                            site: parentSite,
                        });

                        const remoteBranches = await bbApi.repositories.getBranches(parentSite);
                        parentBranches = remoteBranches.map((name) => ({
                            type: RefType.RemoteHead,
                            name: name,
                            remote: parentRemoteName,
                        }));
                    }

                    return {
                        workspaceRepo: wsRepo,
                        href: repo.url,
                        avatarUrl: repo.avatarUrl,
                        localBranches: scm.state.refs.filter((ref) => ref.type === RefType.Head && ref.name),
                        remoteBranches: [
                            ...parentBranches,
                            ...scm.state.refs
                                .filter(
                                    (ref) =>
                                        ref.type === RefType.RemoteHead &&
                                        ref.name &&
                                        scm.state.remotes.find((rem) => ref.name!.startsWith(rem.name))
                                )
                                .map((ref) => ({
                                    ...ref,
                                    remote: scm.state.remotes.find((rem) => ref.name!.startsWith(rem.name))!.name,
                                })),
                        ],
                        branchTypes: [],
                        developmentBranch: developmentBranch,
                        hasLocalChanges:
                            scm.state.workingTreeChanges.length +
                                scm.state.indexChanges.length +
                                scm.state.mergeChanges.length >
                            0,
                        isCloud: site.details.isCloud,
                    };
                })
            );

            if (state.length > 0) {
                this.postMessage({ type: 'createPullRequestData', repositories: state });
            } else {
                const bbSites = Container.siteManager.getSitesAvailable(ProductBitbucket);
                const reason =
                    bbSites.length === 0
                        ? 'Authenticate with Bitbucket and try again'
                        : `No Bitbucket repositories found in the current workspace in VS Code corresponding to the authenticated Bitbucket instances: ${bbSites
                              .map((site) => site.host)
                              .join(', ')}`;
                this.postMessage({ type: 'error', reason: this.formatErrorReason(reason, 'No Bitbucket repos') });
            }
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
                            const commits = await this.fetchDetails(e);
                            this.postMessage({ type: 'commitsResult', commits: commits });
                        } catch (e) {
                            Logger.error(new Error(`error fetching details: ${e}`));
                            // ignore error and send empty response
                            this.postMessage({ type: 'commitsResult', commits: [] });
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
                            const reviewers = await this.fetchReviewers(e.site, e.query);
                            this.postMessage({ type: 'fetchUsersResult', users: reviewers, nonce: e.nonce });
                        } catch (e) {
                            Logger.error(new Error(`error fetching reviewers: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'fetchDefaultReviewers': {
                    if (isFetchDefaultReviewers(e)) {
                        handled = true;
                        try {
                            const reviewers = await this.fetchReviewers(e.site);
                            this.postMessage({ type: 'fetchDefaultReviewersResult', users: reviewers });
                        } catch (e) {
                            Logger.error(new Error(`error fetching default reviewers: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        showIssue(e.issueOrKey);
                    }
                    break;
                }
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        commands.executeCommand(Commands.ShowBitbucketIssue, e.issue);
                    }
                    break;
                }
                case 'updateDiff': {
                    if (isUpdateDiffAction(e)) {
                        handled = true;
                        try {
                            let fileDiffs: FileDiff[] = await this.generateDiff(
                                e.repoData,
                                e.destinationBranch,
                                e.sourceBranch
                            );
                            this.postMessage({ type: 'diffResult', fileDiffs: fileDiffs });
                        } catch (e) {
                            Logger.error(new Error(`error fetching changed files: ${e}`));
                            // ignore error and send empty response
                            this.postMessage({ type: 'diffResult', fileDiffs: [] });
                        }
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
                case 'openDiffPreview': {
                    if (isOpenDiffPreview(e)) {
                        try {
                            this.openDiffPreview(e.lhsQuery, e.rhsQuery, e.fileDisplayName);
                        } catch (e) {
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async fetchDetails(fetchDetailsAction: FetchDetails): Promise<Commit[]> {
        const { wsRepo, site, sourceBranch, destinationBranch } = fetchDetailsAction;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(`${destinationBranch.remote}/`, '');

        try {
            const bbApi = await clientForSite(site);
            const result = await bbApi.repositories.getCommitsForRefs(site, sourceBranchName, destinationBranchName);
            return result;
        } catch (e) {}

        const shell = new Shell(vscode.Uri.parse(wsRepo.rootUri).fsPath);
        const diff = await shell.output(
            `git log --format=${this.commitFormat} ${destinationBranch.name}..${sourceBranchName} -z`
        );
        const gitCommits = this.parseGitCommits(diff);

        return gitCommits.map((c) => ({
            author: {
                accountId: '',
                displayName: c.authorEmail!,
                avatarUrl: '',
                mention: '',
                url: '',
            },
            ts: c.authorDate!.toString(),
            hash: c.hash,
            message: c.message,
            url: '',
            htmlSummary: '',
            rawSummary: '',
        }));
    }

    commitFormat = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%B';
    commitRegex = /([0-9a-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)/gm;

    private parseGitCommits(data: string): GitCommit[] {
        const commits: GitCommit[] = [];

        let match;

        do {
            match = this.commitRegex.exec(data);
            if (match === null) {
                break;
            }

            const [, ref, authorName, authorEmail, authorDate, commitDate, parents, message] = match;

            commits.push({
                hash: ` ${ref}`.substr(1),
                message: ` ${message}`.substr(1),
                parents: parents ? parents.split(' ') : [],
                authorDate: new Date(Number(authorDate) * 1000),
                authorName: ` ${authorName}`.substr(1),
                authorEmail: ` ${authorEmail}`.substr(1),
                //@ts-ignore
                commitDate: new Date(Number(commitDate) * 1000),
            });
        } while (true);

        return commits;
    }

    private async fetchReviewers(site: BitbucketSite, query?: string): Promise<User[]> {
        const bbApi = await clientForSite(site);
        const currentUserId = site.details.userId;
        let reviewers = await bbApi.pullrequests.getReviewers(site, query);
        reviewers = reviewers.filter((r) => r.accountId !== currentUserId);
        return reviewers;
    }

    async getCurrentRepo(repoData: RepoData): Promise<Repository> {
        const scm: Repository | undefined = Container.bitbucketContext.getRepositoryScm(repoData.workspaceRepo.rootUri);
        if (scm) {
            return scm;
        }
        return Promise.reject(new Error('Could not match repoData object to local repository'));
    }

    async findForkPoint(repoData: RepoData, sourceBranch: Branch, destinationBranch: Branch): Promise<string> {
        const repo: Repository = await this.getCurrentRepo(repoData);

        //When fetching the destination branch, we need to slice the remote off the branch name because the branch isn't actually called {remoteName}/{branchName}
        await repo.fetch(destinationBranch.remote, destinationBranch.name!.slice(destinationBranch.remote!.length + 1));
        const commonCommit = await repo.getMergeBase(destinationBranch.name!, sourceBranch.name!);
        return commonCommit;
    }

    getFilePaths(namestatusWords: string[], status: FileStatus): { lhsFilePath: string; rhsFilePath: string } {
        if (status === FileStatus.ADDED) {
            return { lhsFilePath: '', rhsFilePath: namestatusWords[1] };
        } else if (status === FileStatus.DELETED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: '' };
        } else if (status === FileStatus.MODIFIED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[1] };
        } else if (status === FileStatus.RENAMED) {
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[2] };
        } else {
            //I'm actually not totally sure what should happen if the other cases are hit...
            //Copy, Type changed, unknown, etc.
            return { lhsFilePath: namestatusWords[1], rhsFilePath: namestatusWords[1] };
        }
    }

    async generateDiff(repo: RepoData, destinationBranch: Branch, sourceBranch: Branch): Promise<FileDiff[]> {
        const shell = new Shell(vscode.Uri.parse(repo.workspaceRepo.rootUri).fsPath);

        const forkPoint = await this.findForkPoint(repo, sourceBranch, destinationBranch);

        //Using git diff --numstat will generate lines in the format '{lines added}      {lines removed}     {name of file}'
        //We want to seperate each line and extract this data so we can create a file diff
        //NOTE: the '-M50' flag will cause git to detect any added/deleted file combo as a rename if they're 50% similar
        const numstatLines = await shell.lines(`git diff --numstat -C -M50 ${forkPoint} ${sourceBranch.commit}`);

        if (numstatLines.length === 0) {
            return [];
        }

        //The bitbucket website also provides a status for each file (modified, added, deleted, etc.), so we need to get this info too.
        //git diff-index --name-status will return lines in the form {status}        {name of file}
        //It's important to note that the order of the files will be identical to git diff --numstat, and we can use that to our advantage
        const namestatusLines = await shell.lines(`git diff --name-status -C -M50 ${forkPoint} ${sourceBranch.commit}`);
        let fileDiffs: FileDiff[] = [];
        for (let i = 0; i < numstatLines.length; i++) {
            const numstatWords = numstatLines[i].split(/\s+/);
            const namestatusWords = namestatusLines[i].split(/\s+/);

            //Most of the time when we split by white space we get 3 elements because we have the format {lines added}   {lines removed}   {name of file}
            //However, in the case of a renamed file, the file name will be '{oldFileName => newFileName}'. To account for this case, we slice and join everything after the file name start.
            const filePath = numstatWords.slice(2).join(' ');
            const firstLetterOfStatus = namestatusWords[0].slice(0, 1) as FileStatus;
            const fileStatus = (Object.values(FileStatus).includes(firstLetterOfStatus)
                ? firstLetterOfStatus
                : 'X') as FileStatus;
            const { lhsFilePath, rhsFilePath } = this.getFilePaths(namestatusWords, fileStatus);
            fileDiffs.push({
                linesAdded: +numstatWords[0],
                linesRemoved: +numstatWords[1],
                file: filePath,
                status: fileStatus,
                similarity: fileStatus === FileStatus.RENAMED ? +namestatusWords[0].slice(1) : undefined,
                lhsQueryParams: {
                    lhs: true,
                    repoUri: repo.workspaceRepo.rootUri,
                    branchName: destinationBranch.name,
                    commitHash: forkPoint,
                    path: lhsFilePath,
                } as FileDiffQueryParams,
                rhsQueryParams: {
                    lhs: false,
                    repoUri: repo.workspaceRepo.rootUri,
                    branchName: sourceBranch.name,
                    commitHash: sourceBranch.commit,
                    path: rhsFilePath,
                } as FileDiffQueryParams,
            });
        }

        return fileDiffs;
    }

    async openDiffPreview(
        lhsQueryParam: FileDiffQueryParams,
        rhsQueryParam: FileDiffQueryParams,
        fileDisplayName: string
    ) {
        const lhsQuery = {
            query: JSON.stringify(lhsQueryParam),
        };
        const rhsQuery = {
            query: JSON.stringify(rhsQueryParam),
        };

        const lhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQuery);
        const rhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQuery);
        viewScreenEvent(Registry.screen.pullRequestPreviewDiffScreen, undefined, ProductBitbucket).then((e) => {
            Container.analyticsClient.sendScreenEvent(e);
        });
        vscode.commands.executeCommand('vscode.diff', lhsUri, rhsUri, fileDisplayName);
    }

    async fetchIssueForBranch(e: FetchIssue) {
        let issue: MinimalIssue<DetailedSiteInfo> | BitbucketIssue | undefined = undefined;
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
                    const wsRepo = Container.bitbucketContext.getRepository(Uri.parse(e.repoUri))!;
                    if (wsRepo.mainSiteRemote.site) {
                        const bbApi = await clientForSite(wsRepo.mainSiteRemote.site);
                        const bbIssues = await bbApi.issues!.getIssuesForKeys(wsRepo.mainSiteRemote.site, [
                            bbIssueKeys[0],
                        ]);
                        if (bbIssues.length > 0) {
                            issue = bbIssues[0];
                        }
                    }
                }
            }

            this.postMessage({
                type: 'fetchIssueResult',
                issue: issue,
            });
        }
    }

    private async updateIssue(site: BitbucketSite, issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue) {
        if (!issue) {
            return;
        }
        if (isMinimalIssue(issue)) {
            const transition = issue.transitions.find((t) => t.to.id === issue.status.id);
            if (transition) {
                await transitionIssue(issue, transition);
            }
        } else if (isBitbucketIssue(issue)) {
            const bbApi = await clientForSite(site);
            await bbApi.issues!.postChange(issue, issue.data.state!);
        }
    }

    private async createPullRequest(createPullRequestAction: CreatePullRequest) {
        const {
            workspaceRepo,
            sourceSiteRemote,
            destinationSite,
            reviewers,
            title,
            summary,
            sourceBranch,
            destinationBranch,
            pushLocalChanges,
            closeSourceBranch,
            issue,
        } = createPullRequestAction;
        const sourceBranchName = sourceBranch.name!;
        const destinationBranchName = destinationBranch.name!.replace(`${destinationBranch.remote}/`, '');

        if (pushLocalChanges) {
            Logger.info(`pushing local changes for branch: ${sourceBranchName} to remote: ${sourceSiteRemote.remote} `);
            const scm = Container.bitbucketContext.getRepositoryScm(workspaceRepo.rootUri)!;
            await scm.push(sourceSiteRemote.remote.name, sourceBranchName);
        }

        const bbApi = await clientForSite(destinationSite);

        await bbApi.pullrequests
            .create(destinationSite, workspaceRepo, {
                title: title,
                summary: summary,
                sourceSite: sourceSiteRemote.site!,
                sourceBranchName: sourceBranchName,
                destinationBranchName: destinationBranchName,
                closeSourceBranch: closeSourceBranch,
                reviewerAccountIds: reviewers.map((reviewer) => reviewer.accountId),
            })
            .then(async (pr: PullRequest) => {
                commands.executeCommand(Commands.BitbucketShowPullRequestDetails, pr);
                commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                prCreatedEvent(destinationSite.details).then((e) => {
                    Container.analyticsClient.sendTrackEvent(e);
                });
            });

        await this.updateIssue(destinationSite, issue);
        this.hide();
    }
}
