import * as vscode from "vscode";
import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";
import { Action, onlineStatus, HostErrorMessage } from '../ipc/messaging';
import { BitbucketIssueData } from "../ipc/bitbucketIssueMessaging";
import { BitbucketIssuesApi } from "../bitbucket/bbIssues";
import { isPostComment, isPostChange, isOpenStartWorkPageAction, isCreateJiraIssueAction } from "../ipc/bitbucketIssueActions";
import { Container } from "../container";
import { Logger } from "../logger";
import { Commands } from "../commands";
import { bbIssueUrlCopiedEvent, bbIssueCommentEvent, bbIssueTransitionedEvent } from "../analytics";
import { BitbucketIssue } from "../bitbucket/model";

type Emit = BitbucketIssueData | HostErrorMessage;

export class BitbucketIssueWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<BitbucketIssue> {

    private _issue?: BitbucketIssue;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Bitbucket Issue ";
    }

    public get id(): string {
        return "bitbucketIssueScreen";
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

        this.isRefeshing = true;

        if (this._panel) { this._panel.title = `Bitbucket issue #${issue.id}`; }

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        try {


            const [currentUser, issueLatest, comments, changes] = await Promise.all([
                Container.bitbucketContext.currentUser(),
                BitbucketIssuesApi.refetch(issue),
                BitbucketIssuesApi.getComments(issue),
                BitbucketIssuesApi.getChanges(issue)]
            );

            //@ts-ignore
            // replace comment with change data which contains additional details
            const updatedComments = comments.data.map(comment =>
                changes.data.find(change => change.id! === comment.id!) || comment);
            const msg = {
                type: 'updateBitbucketIssue' as 'updateBitbucketIssue',
                issue: issueLatest,
                currentUser: currentUser,
                comments: updatedComments,
                hasMore: !!comments.next || !!changes.next,
                showJiraButton: Container.config.bitbucket.issues.createJiraEnabled
            } as BitbucketIssueData;

            this.postMessage(msg);
        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields: ${e}` });
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
                    const linkUrl = this._issue!.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    bbIssueUrlCopiedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
                    break;
                }
                case 'assign': {
                    handled = true;
                    try {
                        await BitbucketIssuesApi.assign(this._issue!, (await Container.bitbucketContext.currentUser()).accountId!);
                        await this.update(this._issue!);
                    } catch (e) {
                        Logger.error(new Error(`error updating issue: ${e}`));
                        this.postMessage({ type: 'error', reason: e });
                    }

                    break;
                }
                case 'comment': {
                    if (isPostComment(e)) {
                        handled = true;
                        try {
                            await BitbucketIssuesApi.postComment(this._issue!, e.content);
                            await this.update(this._issue!);
                            bbIssueCommentEvent().then(e => Container.analyticsClient.sendTrackEvent(e));
                        } catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }
                    break;
                }
                case 'change': {
                    if (isPostChange(e)) {
                        handled = true;
                        try {
                            await BitbucketIssuesApi.postChange(this._issue!, e.newStatus, e.content);
                            this._issue = await BitbucketIssuesApi.refetch(this._issue!);
                            await this.update(this._issue!);
                            bbIssueTransitionedEvent().then(e => Container.analyticsClient.sendTrackEvent(e));
                        } catch (e) {
                            Logger.error(new Error(`error posting change: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }
                    break;
                }
                case 'openStartWorkPage': {
                    if (isOpenStartWorkPageAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.StartWorkOnBitbucketIssue, e.issue);
                    }
                    break;
                }
                case 'createJiraIssue': {
                    if (isCreateJiraIssueAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.CreateIssue, e.issue);
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
