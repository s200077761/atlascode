import * as vscode from 'vscode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { FileDiffQueryParams } from './pullRequestNode';
import { PullRequestApi } from '../../bitbucket/pullRequests';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

// PullRequestCommentController is a comment controller for a given PR
export class PullRequestCommentController implements vscode.Disposable {

    private _commentController: vscode.CommentController = vscode.comment.createCommentController('bbpr', 'Bitbucket pullrequests');
    private _commentsCache = new Map<string, vscode.CommentThread>();

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

        this._commentController.emptyCommentThreadFactory = {
            createEmptyCommentThread: (document: vscode.TextDocument, range: vscode.Range) => {
                let thread = this._commentController.createCommentThread('', document.uri, range, []);
                thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
                thread.label = 'Add a new comment';

                thread.acceptInputCommand = {
                    title: 'Add comment',
                    command: Commands.BitbucketAddComment,
                    arguments: [
                        this,
                        document.uri,
                        thread
                    ]
                };
            }
        };
    }

    async addComment(t: vscode.CommentThread, uri: vscode.Uri) {
        if (t.threadId === '') {
            await this.postNewComment(uri, t, this._commentController.inputBox!.value);
            if (t.dispose) {
                t.dispose();
            } else {
                t.comments = [];
            }
        } else {
            await this.postReplyToComment(uri, t, this._commentController.inputBox!.value);
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
        if (this._commentsCache.has(threadId)) {
            this._commentsCache.get(threadId)!.dispose!();
        }

        const newThread = this._commentController.createCommentThread(threadId, uri, range, comments);
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        newThread.acceptInputCommand = {
            title: 'Add comment',
            command: Commands.BitbucketAddComment,
            arguments: [
                this,
                uri,
                newThread
            ]
        };
        this._commentsCache.set(threadId, newThread);
    }

    private async postNewComment(uri: vscode.Uri, commentThread: vscode.CommentThread, text: string) {
        const { remote, prId, path, lhs } = JSON.parse(uri.query) as FileDiffQueryParams;
        const inline = {
            from: lhs ? commentThread.range.start.line + 1 : undefined,
            to: lhs ? undefined : commentThread.range.start.line + 1,
            path: path
        };
        const { data } = await PullRequestApi.postComment(remote, prId, text, undefined, inline);

        const comments = [PullRequestCommentController.createVSCodeComment(data)];

        this.createOrUpdateThread(String(data.id!), uri, commentThread.range, comments);
    }

    private async postReplyToComment(uri: vscode.Uri, commentThread: vscode.CommentThread, text: string) {
        const { remote, prId } = JSON.parse(uri.query) as FileDiffQueryParams;
        const { data } = await PullRequestApi.postComment(remote, prId, text, Number(commentThread.threadId));
        commentThread.comments = [
            ...commentThread.comments,
            PullRequestCommentController.createVSCodeComment(data)
        ];
        this.createOrUpdateThread(commentThread.threadId, uri, commentThread.range, commentThread.comments);
    }

    private static createVSCodeComment(data: Bitbucket.Schema.Comment) {
        return {
            body: new vscode.MarkdownString(turndownService.turndown(data.content!.html!)),
            userName: data.user ? data.user.display_name! : 'Unknown user',
            commentId: String(data.id!)
        };
    }

    dispose() {
        this._commentsCache.clear();
        this._commentController.dispose();
    }
}