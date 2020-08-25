import { Button, Checkbox, Grid, TextField, Typography } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { Task } from '../../../bitbucket/model';

type CommentTaskProps = {
    task: Task;
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};
export const CommentTask: React.FunctionComponent<CommentTaskProps> = ({ task, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [taskContent, setTaskContent] = useState(task.content);

    const handleEditPressed = useCallback(() => {
        setIsEditing(!isEditing);
    }, [isEditing]);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        await onEdit({ ...task, content: taskContent });
        setIsLoading(false);
        setIsEditing(false);
    }, [taskContent, task, onEdit]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleDelete = useCallback(async () => {
        setIsLoading(true);
        await onDelete(task);
        setIsLoading(false);
    }, [task, onDelete]);

    const handleMarkTaskComplete = useCallback(async () => {
        setIsLoading(true);
        await onEdit({ ...task, isComplete: !task.isComplete });
        setIsLoading(false);
    }, [task, onEdit]);

    const handleTaskContentChange = useCallback(
        (event: React.ChangeEvent<{ value: string }>) => {
            setTaskContent(event.target.value);
        },
        [setTaskContent]
    );

    useEffect(() => {
        setTaskContent(task.content);
    }, [task.content]);

    return (
        <React.Fragment>
            {!isEditing ? (
                <Grid container spacing={1} direction="row" alignItems="flex-start">
                    <Checkbox
                        color={'primary'}
                        checked={task.isComplete}
                        onChange={handleMarkTaskComplete}
                        disabled={isLoading}
                    />
                    <Grid item>
                        <Grid container direction={'column'}>
                            <Typography variant="body1">{task.content}</Typography>
                            <Grid item>
                                <Grid container direction={'row'}>
                                    <Grid item hidden={!task.editable}>
                                        <Button color={'primary'} onClick={handleEditPressed} disabled={isLoading}>
                                            Edit
                                        </Button>
                                    </Grid>
                                    <Grid item hidden={!task.deletable}>
                                        <Button color={'primary'} onClick={handleDelete} disabled={isLoading}>
                                            Delete
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            ) : (
                <Grid container spacing={1} direction="row" alignItems="flex-start">
                    <Checkbox color={'primary'} disabled />
                    <Grid item xs>
                        <Grid container direction={'column'}>
                            <TextField
                                size="small"
                                value={taskContent}
                                onChange={handleTaskContentChange}
                                name="content"
                            />
                            <Grid item>
                                <Grid container direction={'row'}>
                                    <Grid item>
                                        <Button
                                            color={'primary'}
                                            onClick={handleSave}
                                            disabled={taskContent.trim() === '' || isLoading}
                                        >
                                            Save
                                        </Button>
                                    </Grid>
                                    <Grid item>
                                        <Button color={'primary'} onClick={handleCancel} disabled={isLoading}>
                                            Cancel
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </React.Fragment>
    );
};
