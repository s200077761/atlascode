import * as React from "react";
import { Branch } from "../../../typings/git";
import SectionMessage from '@atlaskit/section-message';
import styled from "styled-components";

const Padding = styled.div`
  padding: 8px;
`;

export default class BranchWarning extends React.Component<{ sourceBranch: Branch | undefined, sourceRemoteBranchName: string | undefined, remoteBranches: Branch[], hasLocalChanges: boolean | undefined }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.sourceBranch || !this.props.sourceRemoteBranchName) {
            return null;
        }

        const localChangesWarning = (this.props.hasLocalChanges)
            ? <Padding>
                <SectionMessage appearance="warning" title="Uncommitted changes">
                    <div className='ac-vpadding'>
                        <div style={{ color: 'black' }}>There are uncommitted changes for this repo.</div>
                    </div>
                    <div style={{ color: 'black' }}>Ensure the changes that need to be included are committed before creating the pull request.</div>
                </SectionMessage>
              </Padding>
            : null;

        const remoteBranch = this.props.remoteBranches.find(remoteBranch => this.props.sourceRemoteBranchName === remoteBranch.name);
        const upstreamBranchWarning = !remoteBranch
            ? <Padding>
                <SectionMessage appearance="warning" title="No upstream branch">
                    <div className='ac-vpadding'>
                        <div style={{ color: 'black' }}>Upstream branch ({this.props.sourceRemoteBranchName}) not found.</div>
                    </div>
                    <div style={{ color: 'black' }}>Ensure that the checkbox above is checked to push the local changes to remote while creating the pull request.</div>
                </SectionMessage>
              </Padding>
            : null;

        const upstreamBranchStaleWarning = (remoteBranch && this.props.sourceBranch.commit !== remoteBranch.commit)
            ? <Padding>
                <SectionMessage appearance="warning" title="Upstream branch not up to date">
                    <div className='ac-vpadding'>
                        <div style={{ color: 'black' }}>Upstream branch ({this.props.sourceRemoteBranchName}) commit hash does not match with local branch ({this.props.sourceBranch.name}).</div>
                    </div>
                    <div style={{ color: 'black' }}>Ensure that the checkbox above is checked to push the local changes to remote while creating the pull request.</div>
                </SectionMessage>
              </Padding>
            : null;

        return <React.Fragment>
            {localChangesWarning}
            {upstreamBranchWarning}
            {upstreamBranchStaleWarning}
        </React.Fragment>;
    }
}