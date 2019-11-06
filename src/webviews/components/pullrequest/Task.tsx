import React from "react";
import { Checkbox } from '@atlaskit/checkbox';
import { Task, User } from "../../../bitbucket/model";
import Comment, { CommentAction } from '@atlaskit/comment';


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
        editInput: string
    } > {

    constructor(props: any) {
        super(props);
        this.state = {
            editMode: this.props.isInitialized ? false : true,
            editInput: this.props.task.content.raw 
        };
    };

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
        this.setState({editMode: false});
        if(this.props.onEdit){
            this.props.task.content.raw = this.state.editInput;
            this.props.onEdit(this.props.task);
        }
    };

    handleSaveClick = () => {
        this.setState({ editMode: false });
        if(this.props.onSave) {
            this.props.task.content.raw = this.state.editInput;
            this.props.onSave(this.props.task);
        }
    };

    handleDeleteClick = () => {
        if(this.props.onDelete){
            this.props.onDelete(this.props.task);
        }
    };

    handleCheckboxPress = () => {
        if(!this.state.editMode && this.props.onEdit) {
            this.props.task.isComplete = !this.props.task.isComplete;
            this.props.onEdit(this.props.task);
        }
    };

    handleEditInputChange = (e: any) => {
        this.setState({ editInput: e.target.value });
    };

    generateActionsList = () => {
        let actionList = [];
        if(this.props.onEdit && !this.state.editMode && this.props.task.editable) {
            actionList.push(<CommentAction onClick={this.handleEditClick}>Edit</CommentAction>);
        }
        if(this.props.onDelete && !this.state.editMode && this.props.task.deletable) {
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
                    <Checkbox
                        isChecked={this.props.task.isComplete}
                        onChange={this.handleCheckboxPress}
                        name="controlled-checkbox"
                    />
                    {!this.state.editMode &&
                        <div dangerouslySetInnerHTML={{ __html: this.props.task.content.html }} />
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
                </div>
            }
            actions={this.generateActionsList()}
        >      
        </Comment>; 
    };
};

