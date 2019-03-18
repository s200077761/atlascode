import * as React from 'react';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import Avatar from '@atlaskit/avatar';
import { PRData } from '../../../ipc/prMessaging';
import { Checkout } from '../../../ipc/prActions';


export default class BranchInfo extends React.Component<{ prData: PRData, postMessage: (e: Checkout) => void }> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const pr = this.props.prData.pr!;
        let sourcePrefix = '';
        let destinationPrefix = '';
        if (pr.source!.repository!.links!.html!.href! !== pr.destination!.repository!.links!.html!.href!) {
            sourcePrefix = pr.source!.repository!.full_name! + ':';
            destinationPrefix = pr.destination!.repository!.full_name! + ':';
        }

        const sourceBranch = sourcePrefix + pr.source!.branch!.name;
        const targetBranch = destinationPrefix + pr.destination!.branch!.name;

        return (
            <React.Fragment>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className='ac-hmargin'>
                        <Avatar
                            appearance="circle"
                            name={pr.author!.display_name}
                            src={pr.author!.links!.avatar!.href}
                            size="small"
                        />
                    </div>
                    <div className='ac-branch-lozenge'>
                        <BitbucketBranchesIcon label='branch' size='small' />
                        <span className='ac-branch-lozenge__Text'>{sourceBranch}</span>
                    </div>

                    <div className='ac-hmargin'>
                        <Arrow label="" size="small" />
                    </div>

                    <div className='ac-branch-lozenge'>
                        <BitbucketBranchesIcon label='branch' size='small' />
                        <span className='ac-branch-lozenge__Text'>{targetBranch}</span>
                    </div>
                </div>
            </React.Fragment >
        );
    }
}