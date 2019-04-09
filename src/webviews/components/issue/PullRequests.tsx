import * as React from "react";
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Lozenge from "@atlaskit/lozenge";

export default class PullRequests extends React.Component<{
    pullRequests: any[]
    onClick: (pr: any) => any;
}, {}> {
    private avatar(pr: any): any {
        const url = pr.author && pr.author.links && pr.author.links.avatar ? pr.author.links.avatar.href : undefined;
        if (url) {
            return <Avatar src={url} size="small" />;
        }
        return <div />;
    }

    private prState(pr: any): any {
        switch (pr.state) {
            case 'MERGED':
                return <Lozenge appearance='success'>Merged</Lozenge>;
            case 'SUPERSEDED':
                return <Lozenge appearance='moved'>Superseded</Lozenge>;
            case 'OPEN':
                return <Lozenge appearance='inprogress'>Open</Lozenge>;
            case 'DECLINED':
                return <Lozenge appearance='removed'>Declined</Lozenge>;
            default:
                return <div />;
        }
    }

    render() {
        return (
            this.props.pullRequests.map((pr: any) => {
                return <div style={{ display: 'flex', 'align-items': 'center' }} >

                    {this.avatar(pr)}
                    <Button appearance='link' onClick={() => this.props.onClick(pr)}>{`${pr.destination!.repository!.name} - Pull request #${pr.id}`}</Button>
                    {this.prState(pr)}
                </div>;
            })
        );
    }
}