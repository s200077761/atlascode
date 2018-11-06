import { window } from 'vscode';
import { AbstractReactWebview } from './abstractWebview';
import { PullRequestDecorated } from '../bitbucket/model';
import { PullRequest } from '../bitbucket/pullRequests';
import { getCurrentUser } from '../bitbucket/user';
import { PRAction } from '../ipc/prAction';
import { Action } from '../ipc/action';
import { Logger } from '../logger';
import { Repository, Remote } from "../typings/git";

interface PRState {
    prAction:PRAction;
    remote?: Remote;
    repository?: Repository;
}

const emptyState: PRState = {prAction:{action:''}};

export class PullRequestWebview extends AbstractReactWebview<PRAction,Action> {
    private _state: PRState = emptyState;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "AtlasCode Pull Request";
    }
    public get id(): string {
        return "pullRequestView";
    }

    public invalidate() {
        this.forceUpdatePullRequest();
    }

    private validatePRState(s:PRState): boolean {
        return !!s.repository
            && !!s.remote
            && !!s.prAction.pr
            && !!s.prAction.currentUser
            && !!s.prAction.commits
            && !!s.prAction.comments;
    }

    protected onMessageReceived(e: PRAction | Action): boolean {
        let handled = super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'approve': {
                    handled = true;
                    this.approve().catch((e: any) => {
                        Logger.error(new Error(`error approving pull request: ${e}`));
                        window.showErrorMessage('Pull reqeust could not be approved');
                    });
                }
                case 'refreshPR': {
                    handled = true;
                    this.forceUpdatePullRequest();
                }
            }
        }

        return handled;
    }

    public async updatePullRequest(pr: PullRequestDecorated) {
        if (this.validatePRState(this._state)) {
            this._state.prAction.action = 'update-pr';
             this.postMessage(this._state.prAction);
            return;
        }
        let promises = Promise.all([
            getCurrentUser(),
            PullRequest.getPullRequestCommits(pr),
            PullRequest.getPullRequestComments(pr)
        ]);

        promises.then(result => {
            let [currentUser, commits, comments] = result;
            this._state = {
                repository: pr.repository,
                remote: pr.remote,
                prAction: {
                action: 'update-pr'
                ,currentUser: currentUser
                ,pr: pr.data
                ,commits: commits
                ,comments: comments
                }
            };
            this.postMessage(this._state.prAction);
        },
        reason => {
            Logger.debug("promise rejected!",reason);
        });
    }

    private async approve() {
        await PullRequest.approve({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.prAction.pr! });
        await this.forceUpdatePullRequest();
    }

    private async forceUpdatePullRequest() {
        const result = await PullRequest.getPullRequest({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.prAction.pr! });
        this._state.prAction.pr = result.data;
        await this.updatePullRequest(result).catch(reason => {
            Logger.debug("update rejected", reason);
        });
    }
}
