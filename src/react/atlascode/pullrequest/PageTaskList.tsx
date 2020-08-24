import { Button, Grid } from '@material-ui/core';
import React, { useCallback, useContext, useState } from 'react';
import { Task } from '../../../bitbucket/model';
import { CommentTask } from './CommentTask';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import { TaskAdder } from './TaskAdder';

type PageTaskListProps = {
    tasks: Task[];
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};
export const PageTaskList: React.FunctionComponent<PageTaskListProps> = ({ tasks, onEdit, onDelete }) => {
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const controller = useContext(PullRequestDetailsControllerContext);

    const handleCreateTaskPressed = useCallback(() => {
        setIsCreatingTask(true);
    }, []);

    const handleCancelTask = useCallback(() => {
        setIsCreatingTask(false);
    }, []);

    const handleAddTask = useCallback(
        async (content: string) => {
            await controller.addTask(content);
            setIsCreatingTask(false);
        },
        [controller]
    );

    return (
        <Grid container spacing={1} direction="column" justify="center">
            {tasks.map((task) => (
                <Grid key={task.id} item>
                    <CommentTask task={task} onEdit={onEdit} onDelete={onDelete} />
                </Grid>
            ))}
            {isCreatingTask && (
                <Grid item>
                    <TaskAdder handleCancel={handleCancelTask} addTask={handleAddTask} />
                </Grid>
            )}

            <Grid item>
                <Button
                    color={'primary'}
                    variant={'contained'}
                    onClick={handleCreateTaskPressed}
                    disabled={isCreatingTask}
                >
                    Add Task
                </Button>
            </Grid>
        </Grid>
    );
};
