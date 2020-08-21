import { Avatar, Box, Button, Grid, Typography } from '@material-ui/core';
import { format } from 'date-fns';
import React, { useCallback, useContext, useState } from 'react';
import { Comment, User } from '../../../bitbucket/model';
import CommentForm from '../common/CommentForm';
import { CommentTaskList } from './CommentTaskList';
import { NestedCommentList } from './NestedCommentList';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import { TaskAdder } from './TaskAdder';

type NestedCommentProps = {
    comment: Comment;
    currentUser: User;
    onDelete: (comment: Comment) => void;
};
export const NestedComment: React.FunctionComponent<NestedCommentProps> = ({ comment, currentUser, onDelete }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const controller = useContext(PullRequestDetailsControllerContext);

    const handleReplyPressed = useCallback(() => {
        setIsReplying(true);
    }, []);

    const handleCreateTaskPressed = useCallback(() => {
        setIsCreatingTask(true);
    }, []);

    const handleCancelTask = useCallback(() => {
        setIsCreatingTask(false);
    }, []);

    const handleAddTask = useCallback(
        async (content: string) => {
            await controller.addTask(content, comment.id);
            setIsCreatingTask(false);
        },
        [controller, comment.id]
    );

    const handleSave = useCallback(
        async (content: string) => {
            await controller.postComment(content, comment.id);
            setIsReplying(false);
        },
        [controller, comment.id]
    );

    const handleEditPressed = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleEdit = useCallback(
        async (content: string) => {
            controller.editComment(content, comment.id);
            setIsEditing(false);
        },
        [controller, comment.id]
    );

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleCancel = useCallback(() => {
        setIsReplying(false);
    }, []);

    const handleDelete = useCallback(() => {
        onDelete(comment);
    }, [comment, onDelete]);

    return (
        <React.Fragment>
            {!isEditing && (
                <Grid item container xs zeroMinWidth spacing={1} direction="row" alignItems="flex-start">
                    <Grid item zeroMinWidth>
                        <Avatar src={comment.user.avatarUrl} alt={comment.user.displayName} />
                    </Grid>
                    <Grid container item xs zeroMinWidth direction={'column'}>
                        <Grid item>
                            <Typography variant="subtitle2">
                                {comment.user.displayName}
                                {'  '}
                                {format(comment.ts, 'YYYY-MM-DD h:mm A')}
                            </Typography>
                        </Grid>

                        <Typography dangerouslySetInnerHTML={{ __html: comment.htmlContent }} />
                        <Grid item container direction={'row'}>
                            <Grid item>
                                <Button color={'primary'} onClick={handleReplyPressed}>
                                    Reply
                                </Button>
                            </Grid>
                            <Grid item>
                                <Box hidden={!comment.editable}>
                                    <Button color={'primary'} onClick={handleEditPressed}>
                                        Edit
                                    </Button>
                                </Box>
                            </Grid>
                            <Grid item>
                                <Box hidden={comment.deleted || !comment.deletable}>
                                    <Button color={'primary'} onClick={handleDelete}>
                                        Delete
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Button color={'primary'} onClick={handleCreateTaskPressed}>
                                Create Task
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            )}
            {isEditing && (
                <CommentForm
                    initialContent={comment.rawContent}
                    currentUser={currentUser}
                    onSave={handleEdit}
                    onCancel={handleCancelEdit}
                />
            )}
            <Grid item>
                <Box hidden={!isCreatingTask}>
                    <TaskAdder handleCancel={handleCancelTask} addTask={handleAddTask} />
                </Box>
            </Grid>
            <Grid item>
                <CommentTaskList tasks={comment.tasks} onEdit={controller.editTask} onDelete={controller.deleteTask} />
            </Grid>
            <Grid item>
                <Box hidden={!isReplying} marginLeft={5}>
                    <CommentForm currentUser={currentUser} onSave={handleSave} onCancel={handleCancel} />
                </Box>
            </Grid>
            {comment.children.length > 0 && (
                <Box marginLeft={5}>
                    <NestedCommentList comments={comment.children} currentUser={currentUser} onDelete={onDelete} />
                </Box>
            )}
        </React.Fragment>
    );
};
