import * as React from 'react';
import Avatar from '@atlaskit/avatar';
import Comment, { CommentAuthor, CommentTime } from '@atlaskit/comment';
import { PRAction } from '../../../ipc/prAction';
import * as Bitbucket from 'bitbucket';


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

const NestedComment = ({ data, children }: Node): any => (
    <Comment
        avatar={<Avatar src={data.user!.links!.avatar!.href} label="Atlaskit avatar" size="medium" />}
        author={<CommentAuthor>{data.user!.display_name}</CommentAuthor>}
        time={<CommentTime>{new Date(data.created_on!).toDateString()}</CommentTime>}
        content={<p dangerouslySetInnerHTML={{ __html: data.content!.html! }} />}
    >
        {children && children.map(child => <NestedComment {...child} />)}
    </Comment>
);

export default class Comments extends React.Component<PRAction, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const nestedGlobalComments = toNestedList(this.props.comments!);
        let result: any[] = [];
        nestedGlobalComments.forEach((commentNode) => {
            if (!commentNode.data.parent) {
                result.push(<NestedComment {...commentNode} />);
            }
        });
        return result;
    }
}