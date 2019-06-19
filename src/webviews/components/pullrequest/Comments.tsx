import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import CommentComponent, { CommentAuthor, CommentTime, CommentAction } from '@atlaskit/comment';
import CommentForm from './CommentForm';
import { User, Comment } from '../../../bitbucket/model';

interface Node {
    data: Comment;
    children: Node[];
}

function toNestedList(comments: Comment[]): Map<Number, Node> {
    const globalCommentsMap = new Map<Number, Node>();
    const globalComments = comments.filter(c => !c.inline);
    globalComments.forEach(c => globalCommentsMap.set(c.id!, { data: c, children: [] }));
    globalComments.forEach(c => {
        const n = globalCommentsMap.get(c.id!);
        const pid = c.parentId;
        if (pid && globalCommentsMap.get(pid)) {
            globalCommentsMap.get(pid)!.children.push(n!);
        }
    });

    return globalCommentsMap;
}

class NestedComment extends React.Component<{ node: Node, currentUser: User, isCommentLoading: boolean, onSave?: (content: string, parentCommentId?: number) => void }, { showCommentForm: boolean }> {
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
        const avatarHref = node.data.user.avatarUrl;
        const authorName = node.data.user.displayName;

        return <CommentComponent className='ac-comment'
            avatar={<Avatar src={avatarHref} size="medium" />}
            author={<CommentAuthor>{authorName}</CommentAuthor>}
            time={<CommentTime>{new Date(node.data.ts).toLocaleString()}</CommentTime>}
            content={
                <React.Fragment>
                    <p dangerouslySetInnerHTML={{ __html: node.data.htmlContent }} />
                    <CommentForm
                        currentUser={currentUser}
                        visible={this.state.showCommentForm}
                        isAnyCommentLoading={this.props.isCommentLoading}
                        onSave={(content: string) => this.handleSave(content, node.data.id)}
                        onCancel={this.handleCancel} />
                </React.Fragment>
            }
            actions={[
                this.props.onSave && !this.state.showCommentForm && <CommentAction onClick={this.handleReplyClick}>Reply</CommentAction>
            ]}
        >
            {node.children && node.children.map(child => <NestedComment node={child} currentUser={currentUser} isCommentLoading={this.props.isCommentLoading} onSave={this.props.onSave} />)}
        </CommentComponent>;
    }
}

export default class Comments extends React.Component<{ comments: Comment[], currentUser: User, isAnyCommentLoading: boolean, onComment?: (content: string, parentCommentId?: number) => void }, {}> {
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
            if (!commentNode.data.parentId) {
                result.push(<NestedComment node={commentNode} currentUser={this.props.currentUser!} isCommentLoading={this.props.isAnyCommentLoading} onSave={this.props.onComment} />);
            }
        });
        return <div className='ac-comments'>{result}</div>;
    }
}
