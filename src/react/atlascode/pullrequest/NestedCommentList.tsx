import { Grid } from '@material-ui/core';
import React from 'react';
import { Comment, User } from '../../../bitbucket/model';
import { NestedComment } from './NestedComment';

type NestedCommentListProps = {
    comments: Comment[];
    currentUser: User;
    onDelete: (comment: Comment) => void;
};
export const NestedCommentList: React.FunctionComponent<NestedCommentListProps> = ({
    comments,
    currentUser,
    onDelete,
}) => {
    return (
        <Grid item container spacing={1} direction="column" justify="center">
            {comments.map((comment) => (
                <NestedComment key={comment.id} comment={comment} currentUser={currentUser} onDelete={onDelete} />
            ))}
        </Grid>
    );
};
