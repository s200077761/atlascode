import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import { State } from '../App';

const style = { fontFamily: "monospace" };
const Hash = (props: any) =>
    <Button appearance="subtle-link" href={props.href} >
        <span style={style}>{props.hash}</span>
    </Button>;
const Message = (props: any) => <p style={{ display: "inline" }}>{props.message}</p>;

export default class Commits extends React.Component<State, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const commitsData = this.props.commits.map((commit) => {
            return {
                hash: commit.hash!,
                message: commit.message,
                href: commit.links.html.href
            };
        });

        return (
            <TableTree
                columns={[Hash, Message]}
                items={commitsData.map(c => {
                    return {
                        id: c.hash,
                        content: {
                            hash: c.hash.substring(0, 8),
                            message: c.message,
                            href: c.href
                        }
                    };
                })}
            />
        );
    }
}