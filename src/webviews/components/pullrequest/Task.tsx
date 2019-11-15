import { Checkbox } from '@atlaskit/checkbox';
import Comment, { CommentAction } from '@atlaskit/comment';
import React from "react";
import { Task, User } from "../../../bitbucket/model";


export class TaskComponent extends React.Component<
    { 
        task: Task, //When creating a new task, should be initialized to some dummy data
        currentUser: User, 
        onDelete?: (task: Task) => void,
        onEdit?: (task: Task) => void, //onEdit gets called when 'save' is pressed for an initialized task
        onSave?: (task: Task) => void, //onSave gets called when 'save' is pressed for an uninitialized task
        cancelCreate?: () => void
        isInitialized?: boolean //Set to true when creating a new task
    }, 
    { 
        editMode: boolean,
        editInput: string,
        isChecked: boolean,
        beingDeleted: boolean,
        isWaitingForServer: boolean
    } > {

    constructor(props: any) {
        super(props);
        this.state = {
            editMode: this.props.isInitialized ? false : true,
            editInput: this.props.task.content.raw,
            isChecked: this.props.task.isComplete,
            beingDeleted: false,
            isWaitingForServer: false
        };
    };

    componentWillReceiveProps(props: any){
        this.setState({isChecked: props.task.isComplete, beingDeleted: false, isWaitingForServer: false });
    }

    handleEditClick = () => {
        this.setState({ editMode: true });
    };

    handleCancelClick = () => {
        this.setState({ editMode: false, editInput: this.props.task.content.raw });
        if(!this.props.isInitialized && this.props.cancelCreate) {
            this.props.cancelCreate();
        }
    };

    handleEditSaveClick = () => {
        this.setState({editMode: false, isWaitingForServer: true });
        if(this.props.onEdit){
            const task = { ...this.props.task, content: {...this.props.task.content, raw: this.state.editInput } };
            this.props.onEdit(task);
        }
    };

    handleSaveClick = () => {
        this.setState({ editMode: false, isWaitingForServer: true });
        if(this.props.onSave) {
            const task = { ...this.props.task, content: {...this.props.task.content, raw: this.state.editInput } };
            this.props.onSave(task);
        }
    };

    handleDeleteClick = () => {
        if(this.props.onDelete){
            this.setState({ beingDeleted: true });
            this.props.onDelete(this.props.task);
        }
    };

    handleCheckboxPress = () => {
        if(!this.state.editMode) {
            this.setState( {isChecked: !this.state.isChecked }, 
            () => {
                if(this.props.onEdit) {
                    const task = { ...this.props.task, isComplete: this.state.isChecked };
                    this.props.onEdit(task);
                }
            } );
        }
    };

    handleEditInputChange = (e: any) => {
        this.setState({ editInput: e.target.value });
    };

    generateActionsList = () => {
        let actionList = [];
        if(this.props.onEdit && !this.state.editMode && this.props.task.editable && !this.state.beingDeleted && !this.state.isChecked) {
            actionList.push(<CommentAction onClick={this.handleEditClick}>Edit</CommentAction>);
        }
        if(this.props.onDelete && !this.state.editMode && this.props.task.deletable && !this.state.beingDeleted && !this.state.isChecked) {
            actionList.push(<CommentAction onClick={this.handleDeleteClick}>Delete</CommentAction>);
        }
        if((this.props.onSave || this.props.onEdit) && this.state.editMode) {
            //The save button looks the same when the task is being created for the first time and when the task is being edited.
            //We want this save button to do different actions depending on if the task has already been initialized or not
            actionList.push(<CommentAction onClick={this.props.isInitialized ? this.handleEditSaveClick : this.handleSaveClick}>Save</CommentAction>);
        }
        if(this.state.editMode || !this.props.isInitialized) {
            actionList.push(<CommentAction onClick={this.handleCancelClick}>Cancel</CommentAction>);
        }
        return actionList;
    };
    
    render(): any {
        return <Comment className='ac-comment'
            content={
                <div style={{display: "flex"}}>
                    {!this.state.beingDeleted &&
                        <React.Fragment>
                            <Checkbox
                                isChecked={this.state.isChecked}
                                onChange={this.handleCheckboxPress}
                                name="controlled-checkbox"
                            />
                            {!this.state.editMode &&
                                //Tasks which are complete appear striked through on the site, but for some reason the task's internal html does not handle this...
                                <p>
                                    {this.state.isChecked ? 
                                        <del>{this.state.isWaitingForServer ? this.state.editInput : this.props.task.content.raw}</del> :
                                        <div>{this.state.isWaitingForServer ? this.state.editInput : this.props.task.content.raw}</div>
                                    }
                                </p>
                            }
                            {this.state.editMode && 
                                <textarea
                                    className='ac-textarea'
                                    rows={1}
                                    placeholder='Add new task'
                                    value={this.state.editInput}
                                    onChange={this.handleEditInputChange}
                                />
                            }
                        </React.Fragment>
                    }   
                </div>
            }
            actions={this.generateActionsList()}
        >      
        </Comment>; 
    };
};

