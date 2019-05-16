import * as vscode from 'vscode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { FileDiffQueryParams } from './pullRequestNode';
import { PullRequestApi } from '../../bitbucket/pullRequests';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

// PullRequestCommentController is a comment controller for a given PR
export class PullRequestCommentController implements vscode.Disposable {

    private _commentController: vscode.CommentController = vscode.comment.createCommentController('bbpr', 'Bitbucket pullrequest comments');
    // map of comment threads keyed by pull request - Map<`pull request href`, Map<`comment id`, vscode.CommentThread>>
    private _commentsCache = new Map<string, Map<string, vscode.CommentThread>>();

    constructor() {
        this._commentController.commentingRangeProvider = {
            provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.Range[] | undefined => {
                if (document.uri.scheme !== PullRequestNodeDataProvider.SCHEME) {
                    return undefined;
                }

                let lineCount = document.lineCount;
                return [new vscode.Range(0, 0, lineCount - 1, 0)];
            }
        };

        this._commentController.template = {
            label: 'Add a new comment',
            acceptInputCommand: {
                title: 'Add comment',
                command: Commands.BitbucketAddComment,
                arguments: [
                    this
                ]
            }
        };
    }

    async addComment(t: vscode.CommentThread) {
        if (!t || t.id === '') {
            await this.postNewComment(this._commentController.inputBox!);
        } else {
            await this.postReplyToComment(this._commentController.inputBox!.resource, t, this._commentController.inputBox!.value);
        }
        this._commentController.inputBox!.value = '';
    }

    provideComments(uri: vscode.Uri) {
        const { commentThreads } = JSON.parse(uri.query) as FileDiffQueryParams;

        (commentThreads || [])
            .forEach((c: Bitbucket.Schema.Comment[]) => {
                let range = new vscode.Range(0, 0, 0, 0);
                if (c[0].inline!.from) {
                    range = new vscode.Range(c[0].inline!.from! - 1, 0, c[0].inline!.from! - 1, 0);
                } else if (c[0].inline!.to) {
                    range = new vscode.Range(c[0].inline!.to! - 1, 0, c[0].inline!.to! - 1, 0);
                }

                const comments = c.map(comment => PullRequestCommentController.createVSCodeComment(comment));

                this.createOrUpdateThread(String(c[0].id!), uri, range, comments);
            });
    }

    private createOrUpdateThread(threadId: string, uri: vscode.Uri, range: vscode.Range, comments: vscode.Comment[]) {
        const { prHref } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;

        if (prCommentCache.has(threadId)) {
            prCommentCache.get(threadId)!.dispose!();
        }

        const newThread = this._commentController.createCommentThread(threadId, uri, range, comments);
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        newThread.acceptInputCommand = {
            title: 'Add comment',
            command: Commands.BitbucketAddComment,
            arguments: [
                this,
                newThread
            ]
        };
        prCommentCache.set(threadId, newThread);
    }

    private async postNewComment(inputBox: vscode.CommentInputBox) {
        const { remote, prId, path, lhs } = JSON.parse(inputBox.resource.query) as FileDiffQueryParams;
        const inline = {
            from: lhs ? inputBox.range.start.line + 1 : undefined,
            to: lhs ? undefined : inputBox.range.start.line + 1,
            path: path
        };
        const { data } = await PullRequestApi.postComment(remote, prId, inputBox.value, undefined, inline);

        const comments = [PullRequestCommentController.createVSCodeComment(data)];

        this.createOrUpdateThread(String(data.id!), inputBox.resource, inputBox.range, comments);
    }

    private async postReplyToComment(uri: vscode.Uri, commentThread: vscode.CommentThread, text: string) {
        const { remote, prId } = JSON.parse(uri.query) as FileDiffQueryParams;
        const { data } = await PullRequestApi.postComment(remote, prId, text, Number(commentThread.id));
        commentThread.comments = [
            ...commentThread.comments,
            PullRequestCommentController.createVSCodeComment(data)
        ];
        this.createOrUpdateThread(commentThread.id, uri, commentThread.range, commentThread.comments);
    }

    private static createVSCodeComment(data: Bitbucket.Schema.Comment) {
        return {
            body: new vscode.MarkdownString(turndownService.turndown(data.content!.html!)),
            userName: data.user ? data.user.display_name! : 'Unknown user',
            author: {
                name: data.user ? data.user.display_name! : 'Unknown user'
            },
            commentId: String(data.id!),
            id: String(data.id!)
        };
    }

    disposePR(prHref: string) {
        if (this._commentsCache.has(prHref)) {
            this._commentsCache.get(prHref)!.forEach(val => val.dispose());
            this._commentsCache.delete(prHref);
        }
    }

    dispose() {
        this._commentsCache.clear();
        this._commentController.dispose();
    }
}