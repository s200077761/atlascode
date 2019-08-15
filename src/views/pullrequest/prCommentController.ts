import * as vscode from 'vscode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { FileDiffQueryParams } from './pullRequestNode';
import TurndownService from 'turndown';
import { Comment } from '../../bitbucket/model';
import { clientForRemote } from '../../bitbucket/bbUtils';
import { BitbucketMentionsCompletionProvider } from '../../bitbucket/bbMentionsCompletionProvider';

const turndownService = new TurndownService();
turndownService.addRule('mention', {
    filter: function (node) {
        return node.classList.contains('ap-mention');
    },
    replacement: function (content, _, options) {
        return `${options.emDelimiter}${content}${options.emDelimiter}`;
    }
});

interface PullRequestComment extends vscode.Comment {
    prCommentThreadId?: number;
}

// PullRequestCommentController is a comment controller for a given PR
export class PullRequestCommentController implements vscode.Disposable {

    private _commentController: vscode.CommentController = vscode.comments.createCommentController('bbpr', 'Bitbucket pullrequest comments');
    // map of comment threads keyed by pull request - Map<`pull request href`, Map<`comment id`, vscode.CommentThread>>
    private _commentsCache = new Map<string, Map<number, vscode.CommentThread>>();

    constructor(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider({ scheme: 'comment' }, new BitbucketMentionsCompletionProvider(), '@'),
            vscode.commands.registerCommand(Commands.BitbucketAddComment, (reply: vscode.CommentReply) => {
                this.addComment(reply);
            }),
            vscode.commands.registerCommand(Commands.BitbucketToggleCommentsVisibility, (input: vscode.Uri) => {
                this.toggleCommentsVisibility(input);
            })
        );
        this._commentController.commentingRangeProvider = {
            provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.Range[] | undefined => {
                if (document.uri.scheme !== PullRequestNodeDataProvider.SCHEME) {
                    return undefined;
                }

                let lineCount = document.lineCount;
                return [new vscode.Range(0, 0, lineCount - 1, 0)];
            }
        };
    }

    async toggleCommentsVisibility(uri: vscode.Uri) {
        const { prHref } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            return;
        }

        const prCommentCache = this._commentsCache.get(prHref)!;
        prCommentCache.forEach(thread =>
            thread.collapsibleState = thread.collapsibleState === vscode.CommentThreadCollapsibleState.Collapsed
                ? vscode.CommentThreadCollapsibleState.Expanded
                : vscode.CommentThreadCollapsibleState.Collapsed);
    }

    async addComment(reply: vscode.CommentReply) {
        const { remote, prId, path, lhs } = JSON.parse(reply.thread.uri.query) as FileDiffQueryParams;
        const inline = {
            from: lhs ? reply.thread.range.start.line + 1 : undefined,
            to: lhs ? undefined : reply.thread.range.start.line + 1,
            path: path
        };
        const commentThreadId = reply.thread.comments.length === 0 ? undefined : (reply.thread.comments[0] as PullRequestComment).prCommentThreadId;
        const bbApi = await clientForRemote(remote);
        const data = await bbApi.pullrequests.postComment(remote, prId, reply.text, commentThreadId, inline);

        const comments = [
            ...reply.thread.comments,
            PullRequestCommentController.createVSCodeComment(data.id!, data)
        ];

        this.createOrUpdateThread(data.id!, reply.thread.uri, reply.thread.range, comments);

        reply.thread.dispose();
    }

    provideComments(uri: vscode.Uri) {
        const { commentThreads } = JSON.parse(uri.query) as FileDiffQueryParams;

        (commentThreads || [])
            .forEach((c: Comment[]) => {
                let range = new vscode.Range(0, 0, 0, 0);
                if (c[0].inline!.from) {
                    range = new vscode.Range(c[0].inline!.from! - 1, 0, c[0].inline!.from! - 1, 0);
                } else if (c[0].inline!.to) {
                    range = new vscode.Range(c[0].inline!.to! - 1, 0, c[0].inline!.to! - 1, 0);
                }

                const comments = c.map(comment => PullRequestCommentController.createVSCodeComment(c[0].id!, comment));

                this.createOrUpdateThread(c[0].id!, uri, range, comments);
            });
    }

    private createOrUpdateThread(threadId: number, uri: vscode.Uri, range: vscode.Range, comments: vscode.Comment[]) {
        const { prHref } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;

        if (prCommentCache.has(threadId)) {
            prCommentCache.get(threadId)!.dispose();
        }

        const newThread = this._commentController.createCommentThread(uri, range, comments);
        newThread.label = '';
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

        prCommentCache.set(threadId, newThread);
    }

    private static createVSCodeComment(prCommentThreadId: number, comment: Comment): PullRequestComment {
        return {
            prCommentThreadId: prCommentThreadId,
            body: new vscode.MarkdownString(turndownService.turndown(comment.htmlContent)),
            author: {
                name: comment.user.displayName || 'Unknown user',
                iconPath: vscode.Uri.parse(comment.user.avatarUrl)
            },
            mode: vscode.CommentMode.Editing
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