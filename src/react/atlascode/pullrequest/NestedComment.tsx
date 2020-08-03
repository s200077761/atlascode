import { Avatar, Box, Button, Grid, Typography } from '@material-ui/core';
import { format } from 'date-fns';
import React, { useCallback, useContext, useState } from 'react';
import { Comment, User } from '../../../bitbucket/model';
import CommentForm from '../common/CommentForm';
import { NestedCommentList } from './NestedCommentList';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';

type NestedCommentProps = {
    comment: Comment;
    currentUser: User;
    onDelete: (comment: Comment) => void;
};
export const NestedComment: React.FunctionComponent<NestedCommentProps> = ({ comment, currentUser, onDelete }) => {
    const [isReplying, setIsReplying] = useState(false);
    const controller = useContext(PullRequestDetailsControllerContext);

    const handleReplyPressed = useCallback(() => {
        setIsReplying(true);
    }, []);

    //TODO: Should this really be async?
    const handleSave = useCallback(
        async (content: string) => {
            controller.postComment(content, comment.id);
            setIsReplying(false);
        },
        [controller, comment.id]
    );

    const handleCancel = useCallback(() => {
        setIsReplying(false);
    }, []);

    const handleDelete = useCallback(() => {
        onDelete(comment);
    }, [comment, onDelete]);

    return (
        <React.Fragment>
            <Grid item container key={comment.id} xs zeroMinWidth spacing={1} direction="row" alignItems="flex-start">
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
                            <Box hidden={comment.deleted || !comment.deletable}>
                                <Button color={'primary'} onClick={handleDelete}>
                                    Delete
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
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
