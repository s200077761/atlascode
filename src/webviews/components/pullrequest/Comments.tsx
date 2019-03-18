import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import Comment, { CommentAuthor, CommentTime, CommentAction } from '@atlaskit/comment';
import * as Bitbucket from 'bitbucket';
import CommentForm from './CommentForm';

interface Node {
    data: Bitbucket.Schema.Comment;
    children: Node[];
}

function toNestedList(comments: Bitbucket.Schema.Comment[]): Map<Number, Node> {
    const globalCommentsMap = new Map<Number, Node>();
    const globalComments = comments.filter(c => !c.inline && !c.deleted);
    globalComments.forEach(c => globalCommentsMap.set(c.id!, { data: c, children: [] }));
    globalComments.forEach(c => {
        const n = globalCommentsMap.get(c.id!);
        const pid = c.parent && c.parent.id;
        if (pid && globalCommentsMap.get(pid)) {
            globalCommentsMap.get(pid)!.children.push(n!);
        }
    });

    return globalCommentsMap;
}

class NestedComment extends React.Component<{ node: Node, currentUser: Bitbucket.Schema.User, onSave?: (content: string, parentCommentId?: number) => void }, { showCommentForm: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { showCommentForm: false };
    }

    handleReplyClick = () => {
        this.setState({ showCommentForm: true });
    }

    handleSave = (content: string, parentCommentId?: number) => {
        if (this.props.onSave) {
            this.props.onSave(content, parentCommentId);
            this.setState({ showCommentForm: false });
        }
    }

    handleCancel = () => {
        this.setState({ showCommentForm: false });
    }

    render(): any {
        const { node, currentUser } = this.props;

        return <Comment className='ac-comment'
            avatar={<Avatar src={node.data.user!.links!.avatar!.href} size="medium" />}
            author={<CommentAuthor>{node.data.user!.display_name}</CommentAuthor>}
            time={<CommentTime>{new Date(node.data.created_on!).toDateString()}</CommentTime>}
            content={
                <React.Fragment>
                    <p dangerouslySetInnerHTML={{ __html: node.data.content!.html! }} />
                    <CommentForm
                        currentUser={currentUser}
                        visible={this.state.showCommentForm}
                        onSave={(content: string) => this.handleSave(content, node.data.id!)}
                        onCancel={this.handleCancel} />
                </React.Fragment>
            }
            actions={[
                this.props.onSave && !this.state.showCommentForm && <CommentAction onClick={this.handleReplyClick}>Reply</CommentAction>
            ]}
        >
            {node.children && node.children.map(child => <NestedComment node={child} currentUser={currentUser} onSave={this.props.onSave} />)}
        </Comment>;
    }
}

export default class Comments extends React.Component<{ comments: Bitbucket.Schema.Comment[], currentUser: Bitbucket.Schema.User, onComment?: (content: string, parentCommentId?: number) => void }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.comments || !this.props.currentUser) {
            return null;
        }
        const nestedGlobalComments = toNestedList(this.props.comments!);
        let result: any[] = [];
        nestedGlobalComments.forEach((commentNode) => {
            if (!commentNode.data.parent) {
                result.push(<NestedComment node={commentNode} currentUser={this.props.currentUser!} onSave={this.props.onComment} />);
            }
        });
        return <div className='ac-comments'>{result}</div>;
    }
}
