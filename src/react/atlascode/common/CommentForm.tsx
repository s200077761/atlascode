import { Avatar, Grid } from '@material-ui/core';
import React from 'react';
import { User } from '../../../bitbucket/model';
import { Editor } from './editor/MarkdownEditor';

type CommentFormProps = {
    currentUser: User;
    onSave: (content: string) => Promise<void>;
    fetchUsers: (input: string) => Promise<User[]>;
};

const CommentForm: React.FC<CommentFormProps> = (props: CommentFormProps) => {
    return (
        <Grid container spacing={1} alignItems="flex-start">
            <Grid item>
                <Avatar src={props.currentUser.avatarUrl} />
            </Grid>
            <Grid item xs={10}>
                <Grid container spacing={1} direction="column">
                    <Grid item>
                        <Editor onSave={props.onSave} fetchUsers={props.fetchUsers} />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default CommentForm;
