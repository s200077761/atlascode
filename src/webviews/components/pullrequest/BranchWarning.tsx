import * as React from "react";
import { Branch } from "../../../typings/git";
import SectionMessage from '@atlaskit/section-message';
import styled from "styled-components";

const Padding = styled.div`
  padding: 8px;
`;

export default class BranchWarning extends React.Component<{ sourceBranch: Branch | undefined, sourceRemoteBranchName: string | undefined, remoteBranches: Branch[] }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (!this.props.sourceBranch || !this.props.sourceRemoteBranchName) {
            return null;
        }

        const remoteBranch = this.props.remoteBranches.find(remoteBranch => this.props.sourceRemoteBranchName === remoteBranch.name);
        if (!remoteBranch) {
            return (
                <Padding>
                    <SectionMessage appearance="warning" title="No upstream branch">
                        <div className='ac-vpadding'>
                            <div style={{ color: 'black' }}>Upstream branch ({this.props.sourceRemoteBranchName}) not found.</div>
                        </div>
                        <div style={{ color: 'black' }}>Check the box above to push the local changes to remote while creating the pull request.</div>
                    </SectionMessage>
                </Padding>
            );
        }

        if (this.props.sourceBranch.commit !== remoteBranch.commit) {
            return (
                <Padding>
                    <SectionMessage appearance="warning" title="Upstream branch not up to date">
                        <div className='ac-vpadding'>
                            <p>Upstream branch ({this.props.sourceRemoteBranchName}) commit hash does not match with local branch ({this.props.sourceBranch.name}).</p>
                        </div>
                        <p>Check the box above to push the local changes to remote while creating the pull request.</p>
                    </SectionMessage>
                </Padding>
            );
        }

        return null;
    }
}