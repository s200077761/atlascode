import * as vscode from 'vscode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { FileDiffQueryParams } from './pullRequestNode';
import TurndownService from 'turndown';
import { Comment } from '../../bitbucket/model';
import { clientForRemote } from '../../bitbucket/bbUtils';
import { Container } from '../../container';
import { Remote } from '../../typings/git';

const turndownService = new TurndownService();

interface PullRequestComment extends vscode.Comment {
    prCommentThreadId: number | undefined;
    parent?: vscode.CommentThread;
    remote: Remote;
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
            vscode.commands.registerCommand(Commands.BitbucketAddComment, (reply: vscode.CommentReply) => {
                this.addComment(reply);
            }),
            vscode.commands.registerCommand(Commands.BitbucketDeleteComment, (comment: PullRequestComment) => {
                this.deleteComment(comment);
            }),
            vscode.commands.registerCommand(Commands.BBPRCancelCommentEdit, (comment: PullRequestComment) => {
                this.cancelEditComment(comment);
            }),
            vscode.commands.registerCommand(Commands.BBPRSubmitCommentEdit, (comment: PullRequestComment) => {
                this.submitCommentEdit(comment);
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
            await this.createVSCodeComment(data.id!, data, remote, prId)
        ];

        this.createOrUpdateThread(commentThreadId!, reply.thread.uri, reply.thread.range, comments);

        reply.thread.dispose();
    }

    private convertCommentToMode(commentData: PullRequestComment, mode: vscode.CommentMode){
        if(!commentData.parent){
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
        if(commentData.body === ''){
            return;
        }

        this.convertCommentToMode(commentData, vscode.CommentMode.Preview);
        const commentThreadId = commentData.prCommentThreadId;
        if(commentThreadId && commentData.parent){
            const bbApi = await clientForRemote(commentData.remote);
            const data = await bbApi.pullrequests.editComment(commentData.remote, commentData.prId, commentData.body.toString(), commentData.commentId);

            const comments = await Promise.all(commentData.parent.comments.map(async (comment: PullRequestComment) => {
                if(comment.commentId === commentData.commentId){
                    return await this.createVSCodeComment(data.id!, data, commentData.remote, commentData.prId);
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
        if(commentThreadId && commentData.parent){
            const bbApi = await clientForRemote(commentData.remote);
            await bbApi.pullrequests.deleteComment(commentData.remote, commentData.prId, commentData.commentId);

            let comments = commentData.parent.comments.filter((comment: PullRequestComment) => comment.commentId !== commentData.commentId);  

            this.createOrUpdateThread(commentThreadId, commentData.parent.uri, commentData.parent.range, comments);
            commentData.parent.dispose();
        }
    }

    clearCommentCache(uri: vscode.Uri){
        const { prHref } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;
        prCommentCache.forEach(thread => thread.dispose());
    }

    provideComments(uri: vscode.Uri) {
        const { commentThreads, remote, prId } = JSON.parse(uri.query) as FileDiffQueryParams;
        (commentThreads || [])
        .forEach(async (c: Comment[]) => {
            let range = new vscode.Range(0, 0, 0, 0);
            if (c[0].inline!.from) {
                range = new vscode.Range(c[0].inline!.from! - 1, 0, c[0].inline!.from! - 1, 0);
            } else if (c[0].inline!.to) {
                range = new vscode.Range(c[0].inline!.to! - 1, 0, c[0].inline!.to! - 1, 0);
            }

            const comments = await Promise.all(c.map(comment => this.createVSCodeComment(c[0].id!, comment, remote, prId)));

            if(comments.length > 0){
                this.createOrUpdateThread(c[0].id!, uri, range, comments);     
            } 
        });
    }

    private async createOrUpdateThread(threadId: number, uri: vscode.Uri, range: vscode.Range, comments: vscode.Comment[]) {
        const { prHref } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;

        if (prCommentCache.has(threadId)) {
            prCommentCache.get(threadId)!.dispose();
        }

        const newThread = await this._commentController.createCommentThread(uri, range, comments);
        newThread.label = '';
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        for(let comment of newThread.comments){
            (comment as PullRequestComment).parent = newThread;
        }
        
        prCommentCache.set(threadId, newThread);
    }

    private async createVSCodeComment(parentCommentThreadId: number, comment: Comment, remote: Remote, prId: number): Promise<PullRequestComment> {
        let contextValueString = "";
        if (comment.user.accountId === (await Container.bitbucketContext.currentUser(remote)).accountId && !comment.deleted){
            contextValueString = "canEdit,canDelete";
        }

        return {
            prCommentThreadId: parentCommentThreadId,
            body: new vscode.MarkdownString(turndownService.turndown(comment.htmlContent)),
            author: {
                name: comment.user.displayName || 'Unknown user',
                iconPath: vscode.Uri.parse(comment.user.avatarUrl)
            },
            contextValue: contextValueString,
            mode: vscode.CommentMode.Preview,
            remote: remote,
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