import * as React from 'react';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
// import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
// import Lozenge from "@atlaskit/lozenge";
import WarningIcon from '@atlaskit/icon/glyph/warning';
import Avatar from '@atlaskit/avatar';
// import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Tag from '@atlaskit/tag';
import { PRData } from '../../../ipc/prMessaging';
import { Checkout } from '../../../ipc/prActions';
import { Spacer } from '../styles';
// import styled from 'styled-components';

// const FixedWidth = styled.div`
//   max-width: 250px;
// `;

// const VerticalAlignCenter = styled.div`
// display: 'flex';
// align-items: 'center';
// font-weight:'bold';
// `;

export default class BranchInfo extends React.Component<{ prData: PRData, error?: string, postMessage: (e: Checkout) => void }> {
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
                    <Spacer>
                        <Avatar
                            appearance="circle"
                            name={pr.author!.display_name}
                            src={pr.author!.links!.avatar!.href}
                            size="small"
                        />
                    </Spacer>
                    <div className='ac-branch-lozenge'>
                        <BitbucketBranchesIcon label='branch' size='small' />
                        <span className='ac-branch-lozenge__Text'>{sourceBranch}</span>
                    </div>
                    
                    <Spacer>
                        <Arrow label="" size="small" />
                    </Spacer>

                    <div className='ac-branch-lozenge'>
                        <BitbucketBranchesIcon label='branch' size='small' />
                        <span className='ac-branch-lozenge__Text'>{targetBranch}</span>
                    </div>
                </div>
                <div style={{marginLeft: '45px'}}>
                    {this.props.prData.currentBranch === pr.source!.branch!.name && <Tag text="✔ Checked out" color="blueLight" />}
                    {
                        this.props.error &&
                        <Tooltip content={this.props.error} type="warning">
                            <Button appearance="subtle-link" spacing="none" iconBefore={<WarningIcon label="" size="small" />}>Checkout error</Button>
                        </Tooltip>
                    }
                </div>

            </React.Fragment >
        );
    }
}