import { Avatar, Button, Grid, TextField } from '@material-ui/core';
import React, { useCallback, useRef } from 'react';
import { User } from '../../../bitbucket/model';

type CommentFormProps = {
    currentUser: User;
    onSave: (content: string) => Promise<void>;
    onCancel?: () => void;
};

const CommentForm: React.FC<CommentFormProps> = (props: CommentFormProps) => {
    const ref = useRef<HTMLTextAreaElement>();

    const handleSave = useCallback(() => {
        if (ref.current) {
            props.onSave(ref.current.value);
            ref.current.value = '';
        }
    }, [props]);

    const handleCancelComment = useCallback(() => {
        if (ref.current) {
            ref.current.value = '';
        }
        if (props.onCancel) {
            props.onCancel();
        }
    }, [ref, props]);

    return (
        <Grid container spacing={1} alignItems="flex-start">
            <Grid item>
                <Avatar src={props.currentUser.avatarUrl} />
            </Grid>
            <Grid item xs={10}>
                <Grid container spacing={1} direction="column">
                    <Grid item>
                        <TextField inputRef={ref} fullWidth multiline rows={4} />
                    </Grid>
                    <Grid item>
                        <Grid container spacing={1}>
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={handleSave}>
                                    Save
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button variant="contained" onClick={handleCancelComment}>
                                    Cancel
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default CommentForm;
