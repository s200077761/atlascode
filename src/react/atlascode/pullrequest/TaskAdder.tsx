import { Button, Checkbox, CircularProgress, Grid, TextField } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';

type TaskAdderProps = {
    addTask: (content: string) => Promise<void>;
    handleCancel: () => void;
};
export const TaskAdder: React.FunctionComponent<TaskAdderProps> = ({ addTask, handleCancel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [taskContent, setTaskContent] = useState('');

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        await addTask(taskContent);
    }, [taskContent, addTask]);

    const handleCancelClicked = useCallback(() => {
        handleCancel();
    }, [handleCancel]);

    const handleTaskContentChange = useCallback(
        (event: React.ChangeEvent<{ value: string }>) => {
            setTaskContent(event.target.value);
        },
        [setTaskContent]
    );

    useEffect(() => {
        setTaskContent('');
        setIsLoading(false);
    }, []);

    return (
        <Grid container spacing={1} direction="row" alignItems="flex-start">
            <Checkbox color={'primary'} disabled />
            <Grid item xs>
                <Grid container direction={'column'}>
                    {isLoading ? (
                        <CircularProgress />
                    ) : (
                        <TextField
                            size="small"
                            value={taskContent}
                            onChange={handleTaskContentChange}
                            name="content"
                            autoComplete={'off'}
                        />
                    )}

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
                                <Button color={'primary'} onClick={handleCancelClicked} disabled={isLoading}>
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
