import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import CommentComponent, { CommentAction, CommentAuthor, CommentEdited, CommentTime } from '@atlaskit/comment';
import { differenceInSeconds, distanceInWordsToNow } from 'date-fns';
import * as React from 'react';
import { Comment, Task, User } from '../../../bitbucket/model';
import CommentForm from './CommentForm';
import { TaskComponent } from './Task';

class NestedComment extends React.Component<
    { 
        node: Comment, 
        currentUser: User,
        isCommentLoading: boolean,
        onSave?: (content: string, parentCommentId?: string) => void,
        onDelete?: (commentId: string) => void,
        onEdit?: (content: string, commentId: string) => void,
        onTaskDelete?: (task: Task) => void,
        onTaskEdit?: (task: Task) => void,
        onTaskCreate?: (task: Task, commentId: string) => void,
        loadUserOptions?: (input: string) => any
    }, 
    { 
        showCommentForm: boolean,
        commentEditMode: boolean,
        isCreatingTask: boolean,
        receivedDataFromServer:  boolean
    } > {

    constructor(props: any) {
        super(props);
        this.state = { 
            showCommentForm: false,
            commentEditMode: false,
            isCreatingTask: false,
            receivedDataFromServer: true
        };
    }

    componentWillReceiveProps(props: any){
        this.setState({ receivedDataFromServer: true });
    }

    handleDelete = () => {
        if(this.props.onDelete) {
            this.props.onDelete(this.props.node.id);
            this.setState({showCommentForm: false});
        }
    };

    handleEdit = (content: string) => {
        if(this.props.onEdit) {
            this.props.onEdit(content, this.props.node.id);
            this.setState({commentEditMode: false});
        }
    };

    handleEditClick = () => {
        this.setState({commentEditMode: true});
    };

    handleReplyClick = () => {
        this.setState({ showCommentForm: true });
    };

    handleSave = (content: string, parentCommentId?: string) => {
        if (this.props.onSave) {
            this.props.onSave(content, parentCommentId);
            this.setState({ showCommentForm: false });
        }
    };

    handleCancel = () => {
        this.setState({ showCommentForm: false });
    };

    handleCancelEdit = () => {
        this.setState({ commentEditMode: false });
    };

    handleTaskCreateClick = () => {
        this.setState({ isCreatingTask: true, receivedDataFromServer: false });
    };

    handleCancelTaskCreate = () => {
        this.setState({ isCreatingTask: false });
    };

    handleTaskCreate = (task: Task) => {
        this.setState({ isCreatingTask: false });
        if(this.props.onTaskCreate) {
            this.props.onTaskCreate(task, this.props.node.id);
        }
    };

    generateActionsList = () => {
        let actionList = [];
        if(this.props.onSave && !this.state.showCommentForm && !this.state.commentEditMode && !this.props.node.deleted){
            actionList.push(<CommentAction onClick={this.handleReplyClick}>Reply</CommentAction>);
        }
        if(this.props.onEdit && !this.state.showCommentForm && !this.state.commentEditMode && this.props.node.editable){
            actionList.push(<CommentAction onClick={this.handleEditClick}>Edit</CommentAction>);
        }
        if(this.props.onDelete && !this.state.showCommentForm && !this.state.commentEditMode && this.props.node.deletable){
            actionList.push(<CommentAction onClick={this.handleDelete}>Delete</CommentAction>);
        }
        if(this.props.onTaskCreate && !this.state.showCommentForm && !this.state.commentEditMode && !this.props.node.deleted){
            actionList.push(<CommentAction onClick={this.handleTaskCreateClick}>Create task</CommentAction>);
        }
        return actionList;
    };

    editedOrDeleted = () => {
        if(this.props.node.deleted){
            return 'Deleted';
        } else {
            return 'Edited';
        }
    };

    generateDummyTask = () => {
        return {
            commentId: this.props.node.id,
            creator: this.props.node.user,
            created: "",
            updated: "",
            isComplete: false,
            id: "",
            editable: false,
            deletable: false,
            content: ""
        } as Task;
    };

    render(): any {
        const { node, currentUser } = this.props;
        const avatarHref = node.user.avatarUrl;
        const authorName = node.user.displayName;

        return <CommentComponent className='ac-comment'
            avatar={<Avatar src={avatarHref} size="medium" />}
            author={<CommentAuthor>{authorName}</CommentAuthor>}
            time={<CommentTime>{new Date(node.ts).toLocaleString()}</CommentTime>}
            edited={
                //While very close, even comments that are unedited have different creation times and update times. If the difference is greater
                //than one second, it's almost certainly an edit (likewise, edits are very unlikely to occur within 1 seconds of posting);
                //It should be noted the comment API does not provide an 'edited' property, which would avoid this unclean solution.
                differenceInSeconds(this.props.node.updatedTs, this.props.node.ts) > 1 &&
                <CommentEdited>{`${this.editedOrDeleted()} ${distanceInWordsToNow(this.props.node.updatedTs)} ago`}</CommentEdited>
            }
            content={
                <React.Fragment>
                    {
                        this.state.commentEditMode &&
                        <div style={{ width: '100%', marginLeft: 8 }}>
                            <EditForm
                                commentData={node}
                                onCancel={this.handleCancelEdit}
                                onSaveChanges={this.handleEdit}
                            />
                        </div>
                    }
                    {
                        !this.state.commentEditMode && 
                        <React.Fragment>
                            <p dangerouslySetInnerHTML={{ __html: node.htmlContent }} />
                            <CommentForm
                            currentUser={currentUser}
                            visible={this.state.showCommentForm}
                            isAnyCommentLoading={this.props.isCommentLoading}
                            onEdit={(content: string) => this.handleEdit(content)}
                            onSave={(content: string) => this.handleSave(content, node.id)}
                            onDelete={() => this.handleDelete()}
                            onCancel={this.handleCancel}
                            loadUserOptions={this.props.loadUserOptions} />
                        </React.Fragment>
                    } 
                </React.Fragment>
            }
            actions={this.generateActionsList()}
        >
            <React.Fragment>
                { (this.state.isCreatingTask || !this.state.receivedDataFromServer) &&
                    <TaskComponent
                        task={this.generateDummyTask()}
                        onSave={this.handleTaskCreate}
                        cancelCreate={this.handleCancelTaskCreate}
                        isInitialized={false}
                    />
                }
                {   node.tasks &&
                    node.tasks.map(
                        task => <TaskComponent
                                    task={task}
                                    onEdit={this.props.onTaskEdit}
                                    onDelete={this.props.onTaskDelete}
                                    isInitialized={true}
                                />
                    )
                }
                {   node.children && 
                    node.children.map(
                        child => <NestedComment 
                                    node={child} 
                                    currentUser={currentUser} 
                                    isCommentLoading={this.props.isCommentLoading} 
                                    onSave={this.props.onSave}
                                    onDelete={this.props.onDelete}
                                    onEdit={this.props.onEdit}
                                    onTaskDelete={this.props.onTaskDelete}
                                    onTaskEdit={this.props.onTaskEdit}
                                    onTaskCreate={this.props.onTaskCreate}
                                    loadUserOptions={this.props.loadUserOptions}
                                />
                    )
                }
            </React.Fragment>
        </CommentComponent>;
    }
}

export default class Comments extends React.Component<
    { 
        comments: Comment[], 
        currentUser: User, 
        isAnyCommentLoading: boolean, 
        onComment?: (content: string, parentCommentId?: string) => void,
        onDelete?:  (commentId: string) => void,
        onEdit?: (content: string, commentId: string) => void
        onTaskDelete?: (task: Task) => void
        onTaskEdit?: (task: Task) => void
        onTaskCreate?: (task: Task, commentId: string) => void
        loadUserOptions?: (input: string) => any
    }, 
    {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.comments || !this.props.currentUser) {
            return null;
        }
        const result = this.props.comments.filter(comment => !comment.inline).map((comment) =>
            <NestedComment 
                node={comment} 
                currentUser={this.props.currentUser!} 
                isCommentLoading={this.props.isAnyCommentLoading} 
                onSave={this.props.onComment} 
                onEdit={this.props.onEdit}
                onDelete={this.props.onDelete}
                onTaskDelete={this.props.onTaskDelete}
                onTaskEdit={this.props.onTaskEdit}
                onTaskCreate={this.props.onTaskCreate}
                loadUserOptions={this.props.loadUserOptions}
            />
        );
        return <div className='ac-comments'>{result}</div>;
    }
}

class EditForm extends React.Component<
{ 
    commentData: Comment, 
    onSaveChanges?: (content: string) => void,
    onCancel?: () => void,
},
{ editInput: string }
> {
    constructor(props: any) {
        super(props);
        this.state = { 
            editInput: this.props.commentData.rawContent ? this.props.commentData.rawContent : '', 
        };
    }

    handleEditSubmit = () => {
        if(this.props.onSaveChanges && this.state.editInput !== ''){
            this.props.onSaveChanges(this.state.editInput);
        }
    };

    handleChange = (e: any) => {
        this.setState({ editInput: e.target.value });
    };

    render(): any{
        return <div style={{ width: '100%', marginLeft: 8, marginTop: 10 }}>
            <textarea
                className='ac-textarea'
                rows={3}
                placeholder='Add a comment'
                value={this.state.editInput}
                onChange={this.handleChange}
            />
            <ButtonGroup>
                <Button className='ac-button' onClick={this.handleEditSubmit}>Save Changes</Button>
                <Button appearance="default" onClick={this.props.onCancel}>Cancel</Button>
            </ButtonGroup>
        </div>;
    }
}
