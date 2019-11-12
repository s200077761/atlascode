import TurndownService from 'turndown';
import vscode from 'vscode';
import { BitbucketMentionsCompletionProvider } from '../../bitbucket/bbMentionsCompletionProvider';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Comment } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PRFileDiffQueryParams } from './pullRequestNode';

const turndownService = new TurndownService();

turndownService.addRule('mention', {
    filter: function (node) {
        return node.classList.contains('ap-mention') || node.classList.contains('user-mention');
    },
    replacement: function (content, _, options) {
        return `${options.emDelimiter}${content}${options.emDelimiter}`;
    }
});
turndownService.addRule('codeblock', {
    filter: function (node) {
        return node.classList.contains('codehilite');
    },
    replacement: function (content, _, options) {
        return `${options.fence}${content}${options.fence}`;
    }
});

interface PullRequestComment extends vscode.Comment {
    site: BitbucketSite;
    prCommentThreadId: number | undefined;
    parent?: vscode.CommentThread;
    prHref: string;
    prId: number;
    commentId: number;
}

// PullRequestCommentController is a comment controller for a given PR
export class PullRequestCommentController implements vscode.Disposable {

    private _commentController: vscode.CommentController = vscode.comments.createCommentController('bbpr', 'Bitbucket pullrequest comments');
    // map of comment threads keyed by pull request - Map<`pull request href`, Map<`comment id`, vscode.CommentThread>>
    private _commentsCache = new Map<string, Map<number, vscode.CommentThread>>();

    constructor(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider({ scheme: 'comment' }, new BitbucketMentionsCompletionProvider(), '@'),
            vscode.commands.registerCommand(Commands.BitbucketAddComment, async (reply: vscode.CommentReply) => {
                await this.addComment(reply);
                const { prHref } = JSON.parse(reply.thread.uri.query) as PRFileDiffQueryParams;
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(prHref));
            }),
            vscode.commands.registerCommand(Commands.BitbucketDeleteComment, async (comment: PullRequestComment) => {
                await this.deleteComment(comment);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(comment.prHref));
            }),
            vscode.commands.registerCommand(Commands.BBPRCancelCommentEdit, (comment: PullRequestComment) => {
                this.cancelEditComment(comment);
            }),
            vscode.commands.registerCommand(Commands.BBPRSubmitCommentEdit, async (comment: PullRequestComment) => {
                await this.submitCommentEdit(comment);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(comment.prHref));
            }),
            vscode.commands.registerCommand(Commands.BitbucketEditComment, (comment: PullRequestComment) => {
                this.editCommentClicked(comment);
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
                const { site, lhs, addedLines, deletedLines, lineContextMap } = JSON.parse(document.uri.query) as PRFileDiffQueryParams;
                if (site.details.isCloud) {
                    return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
                }

                let result: vscode.Range[] = [];

                const contextLines = lhs
                    ? Object.values(lineContextMap)
                    : Object.keys(lineContextMap).map(parseInt);

                new Set([
                    ...addedLines,
                    ...deletedLines,
                    ...contextLines
                ]).forEach(line => {
                    result.push(new vscode.Range(line - 1, 0, line - 1, 0));
                });

                return result;
            }
        };
    }

    async toggleCommentsVisibility(uri: vscode.Uri) {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

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
        const { site, prHref, prId, path, lhs, addedLines, deletedLines, lineContextMap } = JSON.parse(reply.thread.uri.query) as PRFileDiffQueryParams;

        const commentThreadId = reply.thread.comments.length === 0 ? undefined : (reply.thread.comments[0] as PullRequestComment).prCommentThreadId;

        const lineNumber = reply.thread.range.start.line + 1;
        const inline = {
            from: lhs ? lineNumber : undefined,
            to: lhs ? undefined : lineNumber,
            path: path
        };

        // For Bitbucket Server, the line number on which the comment is added is not always the line on the file.
        // For added and removed lines, it matches the line number on the file.
        // But when contents of LHS and RHS match for a line, the line number of the LHS file must be sent.
        // (Effectively it is the leftmost line number appearing on the unified-diff in the browser)
        let lineType: 'ADDED' | 'REMOVED' | undefined = undefined;
        if (inline.to && lineContextMap.hasOwnProperty(lineNumber)) {
            inline.to = lineContextMap[lineNumber];
        } else if (addedLines.includes(lineNumber)) {
            lineType = 'ADDED';
        } else if (deletedLines.includes(lineNumber)) {
            lineType = 'REMOVED';
        }


        const bbApi = await clientForSite(site);
        const data = await bbApi.pullrequests.postComment(site, prId, reply.text, commentThreadId, inline, lineType);

        const comments = [
            ...reply.thread.comments,
            await this.createVSCodeComment(site, data.id!, data, prHref, prId)
        ];

        this.createOrUpdateThread(commentThreadId!, reply.thread.uri, reply.thread.range, comments);

        reply.thread.dispose();
    }

    private convertCommentToMode(commentData: PullRequestComment, mode: vscode.CommentMode) {
        if (!commentData.parent) {
            return;
        }

        commentData.parent.comments = commentData.parent.comments.map(comment => {
            if (commentData.commentId === (comment as PullRequestComment).commentId) {
                comment.mode = mode;
            }

            return comment;
        });
    }

    editCommentClicked(commentData: PullRequestComment) {
        this.convertCommentToMode(commentData, vscode.CommentMode.Editing);
    }

    cancelEditComment(commentData: PullRequestComment) {
        this.convertCommentToMode(commentData, vscode.CommentMode.Preview);
    }

    async submitCommentEdit(commentData: PullRequestComment) {
        if (commentData.body === '') {
            return;
        }

        this.convertCommentToMode(commentData, vscode.CommentMode.Preview);
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            const bbApi = await clientForSite(commentData.site);
            const data = await bbApi.pullrequests.editComment(commentData.site, commentData.prId, commentData.body.toString(), commentData.commentId);

            const comments = await Promise.all(commentData.parent.comments.map(async (comment: PullRequestComment) => {
                if (comment.commentId === commentData.commentId) {
                    return await this.createVSCodeComment(commentData.site, data.id!, data, commentData.prHref, commentData.prId);
                } else {
                    return comment;
                }
            }));

            this.createOrUpdateThread(commentThreadId!, commentData.parent.uri, commentData.parent.range, comments);
            commentData.parent.dispose();
        }
    }

    async deleteComment(commentData: PullRequestComment) {
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            const bbApi = await clientForSite(commentData.site);
            await bbApi.pullrequests.deleteComment(commentData.site, commentData.prId, commentData.commentId);

            let comments = commentData.parent.comments.filter((comment: PullRequestComment) => comment.commentId !== commentData.commentId);

            this.createOrUpdateThread(commentThreadId, commentData.parent.uri, commentData.parent.range, comments);
            commentData.parent.dispose();
        }
    }

    clearCommentCache(uri: vscode.Uri) {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;
        prCommentCache.forEach(thread => thread.dispose());
    }

    provideComments(uri: vscode.Uri) {
        const { site, commentThreads, prHref, prId } = JSON.parse(uri.query) as PRFileDiffQueryParams;
        (commentThreads || [])
            .forEach(async (c: Comment[]) => {
                let range = new vscode.Range(0, 0, 0, 0);
                if (c[0].inline!.from) {
                    range = new vscode.Range(c[0].inline!.from! - 1, 0, c[0].inline!.from! - 1, 0);
                } else if (c[0].inline!.to) {
                    range = new vscode.Range(c[0].inline!.to! - 1, 0, c[0].inline!.to! - 1, 0);
                }

                const comments = await Promise.all(c.map(comment => this.createVSCodeComment(site, c[0].id!, comment, prHref, prId)));

                if (comments.length > 0) {
                    this.createOrUpdateThread(c[0].id!, uri, range, comments);
                }
            });
    }

    private async createOrUpdateThread(threadId: number, uri: vscode.Uri, range: vscode.Range, comments: vscode.Comment[]) {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

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
        for (let comment of newThread.comments) {
            (comment as PullRequestComment).parent = newThread;
        }

        prCommentCache.set(threadId, newThread);
    }

    private async createVSCodeComment(site: BitbucketSite, parentCommentThreadId: number, comment: Comment, prHref: string, prId: number): Promise<PullRequestComment> {
        let contextValueString = "";
        if (comment.deletable && comment.editable) {
            contextValueString = "canEdit,canDelete";
        } else if (comment.editable) {
            contextValueString = "canEdit";
        } else if (comment.deletable) {
            contextValueString = "canDelete";
        }

        return {
            site: site,
            prCommentThreadId: parentCommentThreadId,
            body: new vscode.MarkdownString(turndownService.turndown(comment.htmlContent)),
            author: {
                name: comment.user.displayName || 'Unknown user',
                iconPath: vscode.Uri.parse(comment.user.avatarUrl)
            },
            contextValue: contextValueString,
            mode: vscode.CommentMode.Preview,
            prHref: prHref,
            prId: prId,
            commentId: comment.id
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