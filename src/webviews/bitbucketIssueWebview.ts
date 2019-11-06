import * as vscode from "vscode";
import { bbIssueCommentEvent, bbIssueTransitionedEvent, bbIssueUrlCopiedEvent } from "../analytics";
import { DetailedSiteInfo, Product, ProductBitbucket } from "../atlclients/authInfo";
import { clientForSite } from "../bitbucket/bbUtils";
import { BitbucketIssue, User } from "../bitbucket/model";
import { Commands } from "../commands";
import { Container } from "../container";
import { isCreateJiraIssueAction, isOpenStartWorkPageAction, isPostChange, isPostComment } from "../ipc/bitbucketIssueActions";
import { BitbucketIssueMessageData } from "../ipc/bitbucketIssueMessaging";
import { Action, onlineStatus } from '../ipc/messaging';
import { isFetchUsers } from "../ipc/prActions";
import { Logger } from "../logger";
import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";


export class BitbucketIssueWebview extends AbstractReactWebview implements InitializingWebview<BitbucketIssue> {

    private _issue?: BitbucketIssue;
    private _participants: Map<string, User> = new Map();

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Bitbucket Issue ";
    }

    public get id(): string {
        return "bitbucketIssueScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        if (this._issue) {
            return this._issue.site.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    initialize(data: BitbucketIssue) {
        this._issue = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        this.invalidate();
    }

    public async invalidate() {
        if (this._issue) {
            this.update(this._issue);
        }
    }

    private async update(issue: BitbucketIssue) {
        if (this.isRefeshing) {
            return;
        }


        if (this._panel) { this._panel.title = `Bitbucket issue #${issue.data.id}`; }

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        try {
            this.isRefeshing = true;

            const bbApi = await clientForSite(issue.site);
            const [currentUser, issueLatest, comments, changes] = await Promise.all([
                Container.bitbucketContext.currentUser(issue.site),
                bbApi.issues!.refetch(issue),
                bbApi.issues!.getComments(issue),
                bbApi.issues!.getChanges(issue)]
            );

            this._participants.clear();
            comments.data.forEach(c => this._participants.set(c.user.accountId, c.user));

            //@ts-ignore
            // replace comment with change data which contains additional details
            const updatedComments = comments.data.map(comment =>
                changes.data.find(change => change.id! === comment.id!) || comment);
            const msg: BitbucketIssueMessageData = {
                type: 'updateBitbucketIssue' as 'updateBitbucketIssue',
                issue: issueLatest,
                currentUser: currentUser,
                comments: updatedComments,
                hasMore: !!comments.next || !!changes.next,
                showJiraButton: Container.config.bitbucket.issues.createJiraEnabled
            };

            this.postMessage(msg);
        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);
        if (!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    this.invalidate();
                    break;
                }

                case 'copyBitbucketIssueLink': {
                    handled = true;
                    const linkUrl = this._issue!.data.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    bbIssueUrlCopiedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
                    break;
                }
                case 'assign': {
                    handled = true;
                    try {
                        const bbApi = await clientForSite(this._issue!.site);
                        await bbApi.issues!.assign(this._issue!, this._issue!.site.details.userId);
                        await this.update(this._issue!);
                    } catch (e) {
                        Logger.error(new Error(`error updating issue: ${e}`));
                        this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                    }

                    break;
                }
                case 'comment': {
                    if (isPostComment(e)) {
                        handled = true;
                        try {
                            const bbApi = await clientForSite(this._issue!.site);
                            await bbApi.issues!.postComment(this._issue!, e.content);
                            await this.update(this._issue!);
                            bbIssueCommentEvent(this._issue!.site.details).then(e => Container.analyticsClient.sendTrackEvent(e));
                        } catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }

                    }
                    break;
                }
                case 'change': {
                    if (isPostChange(e)) {
                        handled = true;
                        try {
                            const bbApi = await clientForSite(this._issue!.site);
                            await bbApi.issues!.postChange(this._issue!, e.newStatus, e.content);
                            this._issue = await bbApi.issues!.refetch(this._issue!);
                            await this.update(this._issue!);
                            bbIssueTransitionedEvent(this._issue!.site.details).then(e => Container.analyticsClient.sendTrackEvent(e));
                        } catch (e) {
                            Logger.error(new Error(`error posting change: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }

                    }
                    break;
                }
                case 'openStartWorkPage': {
                    if (isOpenStartWorkPageAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.StartWorkOnBitbucketIssue, this._issue);
                    }
                    break;
                }
                case 'createJiraIssue': {
                    if (isCreateJiraIssueAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.CreateIssue, this._issue);
                    }
                    break;
                }
                case 'fetchUsers': {
                    if (isFetchUsers(e)) {
                        handled = true;
                        try {
                            // TODO: Fix this after pullrequests api uses site instead of remote
                            // const bbApi = await clientForSite(this._issue!.site);
                            // const reviewers = await bbApi.pullrequests.getReviewers(e.remote, e.query);
                            const reviewers = [];
                            if (reviewers.length === 0) {
                                reviewers.push(...this._participants.values());
                            }
                            this.postMessage({ type: 'fetchUsersResult', users: reviewers });
                        } catch (e) {
                            Logger.error(new Error(`error fetching reviewers: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
