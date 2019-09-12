import * as React from 'react';
import Button from '@atlaskit/button';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import { PRData } from '../../../ipc/prMessaging';

const style = { fontFamily: "monospace" };
const Hash = (props: any) =>
    <Button appearance="subtle-link" href={props.href} >
        <span style={style}>{props.hash}</span>
    </Button>;
const Message = (props: any) => <Tooltip content={props.message}><p style={{ display: "inline" }}>{props.message.trim().split('\n')[0]}</p></Tooltip>;
const Timestamp = (props: any) => {
    const d = new Date(props.ts);
    return <Tooltip content={d.toLocaleString()}><p>{`${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`}</p></Tooltip>;
};

export default class Commits extends React.Component<PRData, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const commitsData = this.props.commits!.map((commit) => {
            return {
                hash: commit.hash,
                message: commit.message,
                href: commit.url,
                ts: commit.ts
            };
        });

        return (
            <TableTree
                columns={[Hash, Message, Timestamp]}
                columnWidths={['120px', '100%', '180px']}
                items={commitsData.map(c => {
                    return {
                        id: c.hash,
                        content: {
                            hash: c.hash.substring(0, 8),
                            message: c.message,
                            href: c.href,
                            ts: c.ts
                        }
                    };
                })}
            />
        );
    }
}