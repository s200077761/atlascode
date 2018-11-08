import { window } from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { PullRequest } from '../bitbucket/model';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { getCurrentUser } from '../bitbucket/user';
import { PRData } from '../ipc/prMessaging';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { Repository, Remote } from "../typings/git";
import { isPostComment } from '../ipc/prActions';

interface PRState {
    prData: PRData;
    remote?: Remote;
    repository?: Repository;
}

const emptyState: PRState = { prData: { type: '' } };

export class PullRequestWebview extends AbstractReactWebview<PRData, Action> implements InitializingWebview<PullRequest> {
    private _state: PRState = emptyState;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Pull Request";
    }
    public get id(): string {
        return "pullRequestView";
    }

    initialize(data: PullRequest) {
        this.updatePullRequest(data);
    }

    public invalidate() {
        this.forceUpdatePullRequest();
    }

    private validatePRState(s: PRState): boolean {
        return !!s.repository
            && !!s.remote
            && !!s.prData.pr
            && !!s.prData.currentUser
            && !!s.prData.commits
            && !!s.prData.comments;
    }

    protected onMessageReceived(e: Action): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'approve': {
                    handled = true;
                    this.approve().catch((e: any) => {
                        Logger.error(new Error(`error approving pull request: ${e}`));
                        window.showErrorMessage('Pull reqeust could not be approved');
                    });
                }
                case 'comment': {
                    if (isPostComment(e)) {
                        handled = true;
                        this.postComment(e.content, e.parentCommentId).catch((e: any) => {
                            Logger.error(new Error(`error posting comment on the pull request: ${e}`));
                            window.showErrorMessage('Pull reqeust comment could not be posted');
                        });
                    }
                }
                case 'refreshPR': {
                    handled = true;
                    this.forceUpdatePullRequest();
                }
            }
        }

        return handled;
    }

    public async updatePullRequest(pr: PullRequest) {
        if (this._panel) { this._panel.title = `Pull Request #${pr.data.id}`; }

        if (this.validatePRState(this._state)) {
            this._state.prData.type = 'update';
            this.postMessage(this._state.prData);
            return;
        }
        let promises = Promise.all([
            getCurrentUser(),
            PullRequestApi.getCommits(pr),
            PullRequestApi.getComments(pr)
        ]);

        promises.then(
            result => {
                let [currentUser, commits, comments] = result;
                this._state = {
                    repository: pr.repository,
                    remote: pr.remote,
                    prData: {
                        type: 'update'
                        , currentUser: currentUser
                        , pr: pr.data
                        , commits: commits
                        , comments: comments
                    }
                };
                this.postMessage(this._state.prData);
            },
            reason => {
                Logger.debug("promise rejected!", reason);
            });
    }

    private async approve() {
        await PullRequestApi.approve({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.prData.pr! });
        await this.forceUpdatePullRequest();
    }

    private async postComment(text: string, parentId?: number) {
        await PullRequestApi.postComment({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.prData.pr! }, text, parentId);
        await this.forceUpdateComments();
    }

    private async forceUpdatePullRequest() {
        const result = await PullRequestApi.get({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.prData.pr! });
        this._state.prData.pr = result.data;
        await this.updatePullRequest(result).catch(reason => {
            Logger.debug("update rejected", reason);
        });
    }

    private async forceUpdateComments() {
        const pr = { repository: this._state.repository!, remote: this._state.remote!, data: this._state.prData.pr! };
        this._state.prData.comments = await PullRequestApi.getComments(pr);
        await this.updatePullRequest(pr);
    }
}
