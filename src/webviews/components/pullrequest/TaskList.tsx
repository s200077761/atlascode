import Button from '@atlaskit/button';
import * as React from 'react';
import { emptyTask, Task } from '../../../bitbucket/model';
import { TaskComponent } from '../pullrequest/Task';

export default class TaskList extends React.Component<
    {
        tasks: Task[];
        onDelete: (task: Task) => void;
        onEdit: (task: Task) => void; //onEdit gets called when 'save' is pressed for an initialized task
        onSave: (task: Task) => void; //onSave gets called when 'save' is pressed for an uninitialized task
        isCloud: boolean;
    },
    {
        creatingTaskMode: boolean;
    }
> {
    constructor(props: any) {
        super(props);
        this.state = {
            creatingTaskMode: false
        };
    }

    handleCancelClick = () => {
        this.setState({ creatingTaskMode: false });
    };

    handleNewTaskClick = () => {
        this.setState({ creatingTaskMode: true });
    };

    handleSaveClicked = (task: Task) => {
        this.setState({ creatingTaskMode: false });
        if (this.props.onSave) {
            this.props.onSave(task);
        }
    };

    render(): any {
        let taskList = this.props.tasks.map(task => (
            <div style={{ marginBottom: '3px' }} key={task.id}>
                <TaskComponent
                    task={task}
                    onDelete={this.props.onDelete}
                    onEdit={this.props.onEdit}
                    onSave={this.handleSaveClicked}
                    cancelCreate={this.handleCancelClick}
                    isInitialized={true}
                />
            </div>
        ));

        if (this.state.creatingTaskMode) {
            taskList.push(
                <div style={{ marginBottom: '3px' }} key={'-1'}>
                    <TaskComponent
                        task={emptyTask}
                        onDelete={this.props.onDelete}
                        onEdit={this.props.onEdit}
                        onSave={this.handleSaveClicked}
                        cancelCreate={this.handleCancelClick}
                        isInitialized={false}
                    />
                </div>
            );
        }

        return (
            <React.Fragment>
                {taskList}
                {!this.state.creatingTaskMode && this.props.isCloud && (
                    <Button
                        style={{ marginTop: '25px', marginBottom: '10px' }}
                        className="ac-button"
                        onClick={this.handleNewTaskClick}
                    >
                        Create New Task
                    </Button>
                )}
            </React.Fragment>
        );
    }
}
