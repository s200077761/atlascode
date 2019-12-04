import TurndownService from 'turndown';
import vscode from 'vscode';
import { BitbucketMentionsCompletionProvider } from '../../bitbucket/bbMentionsCompletionProvider';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Comment, Task } from '../../bitbucket/model';
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
    id: number;
    tasks: Task[];
}

interface PullRequestTask extends vscode.Comment {
    site: BitbucketSite,
    prCommentThreadId: number | undefined,
    parent?: vscode.CommentThread;
    prHref: string,
    prId: number,
    task: Task,
    id: number
}

function isPRTask(commentOrTask: PullRequestComment | PullRequestTask): commentOrTask is PullRequestTask{
    return !!(<PullRequestTask>commentOrTask).task;
}

function isPRComment(commentOrTask: PullRequestComment | PullRequestTask): commentOrTask is PullRequestComment{
    return !!(<PullRequestComment>commentOrTask).tasks;
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
            vscode.commands.registerCommand(Commands.BBPRCancelCommentEdit, (comment: PullRequestComment | PullRequestTask) => {
                this.cancelEditComment(comment);
            }),
            vscode.commands.registerCommand(Commands.BBPRSubmitCommentEdit, async (comment: PullRequestComment | PullRequestTask) => {
                await this.submitCommentEdit(comment);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(comment.prHref));
            }),
            vscode.commands.registerCommand(Commands.BitbucketEditComment, (comment: PullRequestComment) => {
                this.editCommentClicked(comment);
            }),
            vscode.commands.registerCommand(Commands.BitbucketDeleteTask, async (task: PullRequestTask) => {
                await this.deleteTask(task);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(task.prHref));
            }),
            vscode.commands.registerCommand(Commands.BitbucketEditTask, async (task: PullRequestTask) => {
                this.editCommentClicked(task);
            }),
            vscode.commands.registerCommand(Commands.BitbucketMarkTaskComplete, async (taskData: PullRequestTask) => {
                const newComments = await this.updateTask(taskData.parent!.comments, taskData, {isComplete: true});
                this.createOrUpdateThread(taskData.prCommentThreadId!, taskData.parent!.uri, taskData.parent!.range, newComments);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(taskData.prHref));
            }),
            vscode.commands.registerCommand(Commands.BitbucketMarkTaskIncomplete, async (taskData: PullRequestTask) => {
                const newComments = await this.updateTask(taskData.parent!.comments, taskData, {isComplete: false});
                this.createOrUpdateThread(taskData.prCommentThreadId!, taskData.parent!.uri, taskData.parent!.range, newComments);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(taskData.prHref));
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

    private convertCommentToMode(commentData: PullRequestComment | PullRequestTask, mode: vscode.CommentMode) {
        if (!commentData.parent) {
            return;
        }

        commentData.parent.comments = commentData.parent.comments.map(comment => {
            if (commentData.id === (comment as PullRequestComment | PullRequestTask).id) {
                comment.mode = mode;
            }

            return comment;
        });
    }

    editCommentClicked(commentData: PullRequestComment | PullRequestTask) {
        this.convertCommentToMode(commentData, vscode.CommentMode.Editing);
    }

    cancelEditComment(taskData: PullRequestComment | PullRequestTask) {
        this.convertCommentToMode(taskData, vscode.CommentMode.Preview);
    }

    private async replaceEditedComment(comments: (PullRequestComment | PullRequestTask)[], newComment: Comment | Task): Promise<vscode.Comment[]> {
        const newComments: (PullRequestComment | PullRequestTask)[] = await Promise.all(comments.map(async (comment: PullRequestComment | PullRequestTask) => {
            if (comment.id === newComment.id) {
                if(isPRTask(comment)){
                    return await this.createVSCodeCommentTask(comment.site, comment.id!, (newComment as Task), comment.prHref, comment.prId);
                } else {
                    return await this.createVSCodeComment(comment.site, comment.id!, (newComment as Comment), comment.prHref, comment.prId);
                }
            } else {
                return comment;
            }
        }));

        return newComments;
    }

    private async updateTask(comments: readonly vscode.Comment[], taskData: PullRequestTask, newTaskData: Partial<Task>): Promise<PullRequestComment[]> {
        const bbApi = await clientForSite(taskData.site);
        const newTask: Task = await bbApi.pullrequests.editTask(taskData.site, taskData.prId, { ...(taskData as PullRequestTask).task, ...newTaskData });
        return comments.map((comment: PullRequestComment) => {
            if(comment.id === newTask.commentId){
                return {
                    ...comment,
                    tasks: comment.tasks.map(task => {
                        if(task.id === newTask.id){
                            return newTask;
                        } else {
                            return task;
                        }
                    })
                } as PullRequestComment;
            } else {
                return {
                    ...comment
                } as PullRequestComment;
            } 
        });
    }

    async submitCommentEdit(commentData: PullRequestComment | PullRequestTask) {
        if (commentData.body === '') {
            return;
        }

        this.convertCommentToMode(commentData, vscode.CommentMode.Preview);
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            const bbApi = await clientForSite(commentData.site);
            let comments: vscode.Comment[];
            if(isPRComment(commentData)){
                let newComment: Comment = await bbApi.pullrequests.editComment(commentData.site, commentData.prId, commentData.body.toString(), commentData.id);
                
                //The data returned by the comment API endpoint doesn't include task data, so we need to make sure we preserve that...
                newComment.tasks = commentData.tasks;
                comments = await this.replaceEditedComment(commentData.parent!.comments as (PullRequestComment | PullRequestTask)[], newComment);
            } else {
                //Replace the edited task in the associated comment's task list
                comments = await this.updateTask(commentData.parent!.comments, (commentData as PullRequestTask), { content: { raw: commentData.body.toString(), html: "", type: "", markup: "" } });
            }
            
            this.createOrUpdateThread(commentThreadId!, commentData.parent!.uri, commentData.parent!.range, comments);
            commentData.parent!.dispose();
        }
    }

    async deleteComment(commentData: PullRequestComment) {
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            const bbApi = await clientForSite(commentData.site);
            await bbApi.pullrequests.deleteComment(commentData.site, commentData.prId, commentData.id);

            let comments = commentData.parent.comments.filter((comment: PullRequestComment) => comment.id !== commentData.id);

            this.createOrUpdateThread(commentThreadId, commentData.parent.uri, commentData.parent.range, comments);
            commentData.parent.dispose();
        }
    }

    async deleteTask(taskData: PullRequestTask) {
        const commentThreadId = taskData.prCommentThreadId;
        if (commentThreadId && taskData.parent) {
            const bbApi = await clientForSite(taskData.site);
            await bbApi.pullrequests.deleteTask(taskData.site, taskData.prId, taskData.task);

            //Remove the deleted task from the list of tasks in the associated comment's task list
            let comments = taskData.parent.comments.map((comment: PullRequestComment) => {
                if(comment.id === taskData.task.commentId){
                    return {
                        ...comment,
                        tasks: comment.tasks.filter(task => task.id !== taskData.id)
                    } as PullRequestComment;
                } else {
                    return {
                        ...comment
                    } as PullRequestComment;
                } 
            });
            
            this.createOrUpdateThread(commentThreadId, taskData.parent.uri, taskData.parent.range, comments);
            taskData.parent.dispose();
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
            .forEach(async (commentThread: Comment[]) => {
                let range = new vscode.Range(0, 0, 0, 0);
                if (commentThread[0].inline!.from) {
                    range = new vscode.Range(commentThread[0].inline!.from! - 1, 0, commentThread[0].inline!.from! - 1, 0);
                } else if (commentThread[0].inline!.to) {
                    range = new vscode.Range(commentThread[0].inline!.to! - 1, 0, commentThread[0].inline!.to! - 1, 0);
                }

                let comments: PullRequestComment[] = [];
                for (const comment of commentThread) {
                    comments.push(await this.createVSCodeComment(site, commentThread[0].id!, comment, prHref, prId));
                }

                if (comments.length > 0) {
                    this.createOrUpdateThread(commentThread[0].id!, uri, range, comments);
                }
            });
    }

    private async insertTasks(comments: PullRequestComment[]): Promise<vscode.Comment[]> {
        let commentsWithTasks = [];
        for(const comment of comments){
            commentsWithTasks.push(comment);
            for(const task of comment.tasks){
                commentsWithTasks.push(await this.createVSCodeCommentTask(comment.site, comment.prCommentThreadId!, task, comment.prHref, comment.prId));
            }
        }
        return commentsWithTasks;
    }

    private async removeTasks(comments: PullRequestComment[]): Promise<vscode.Comment[]> {
        return comments.filter(comment => isPRComment(comment));
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

        //TODO: I think I also need to remove tasks...
        const commentsWithoutTasks = await this.removeTasks(comments as PullRequestComment[]);
        const commentsWithTasks = await this.insertTasks(commentsWithoutTasks as PullRequestComment[]);

        const newThread = this._commentController.createCommentThread(uri, range, commentsWithTasks);
        newThread.label = '';
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        for (let comment of newThread.comments) {
            if((comment as PullRequestComment).id){
                (comment as PullRequestComment).parent = newThread;
            }
        }

        prCommentCache.set(threadId, newThread);
    }

    private async createVSCodeCommentTask(site: BitbucketSite, parentCommentThreadId: number, task: Task, prHref: string, prId: number): Promise<PullRequestTask>{
        let contextValueList: string[] = [];
        if (task.editable) {
            contextValueList.push("canModifyTask");
        }
        if (task.deletable) {
            contextValueList.push("canRemoveTask");
        }
        if (task.isComplete) {
            contextValueList.push("markIncomplete");
        } else {
            contextValueList.push("markComplete");
        }

        const taskBody = task.isComplete ? 
            new vscode.MarkdownString(`~~${turndownService.turndown(task.content.html)}~~`) : 
            new vscode.MarkdownString(turndownService.turndown(task.content.html));
        return {
            site: site,
            prCommentThreadId: parentCommentThreadId,
            body: taskBody,
            contextValue: contextValueList.join(","),
            author: {
                name: task.isComplete ? 'Task (Complete)' : 'Task',
            },
            mode: vscode.CommentMode.Preview,
            prHref: prHref,
            prId: prId,
            task: task,
            id: task.id
        } as PullRequestTask;
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
            id: comment.id,
            tasks: comment.tasks
        } as PullRequestComment;
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