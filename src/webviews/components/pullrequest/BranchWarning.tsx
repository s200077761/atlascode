import * as React from "react";
import { Branch } from "../../../typings/git";
import SectionMessage from '@atlaskit/section-message';
import styled from "styled-components";

const Padding = styled.div`
  padding: 8px;
`;

export default class BranchWarning extends React.Component<{ sourceRemoteBranchName: string | undefined, remoteBranches: Branch[] }, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (this.props.sourceRemoteBranchName && !this.props.remoteBranches.find(remoteBranch => this.props.sourceRemoteBranchName === remoteBranch.name)) {
            return (
                <Padding>
                    <SectionMessage appearance="warning" title="No upstream branch">
                        <p>Upstream branch ({this.props.sourceRemoteBranchName}) not found. Check the box above to push the local changes to remote while creating the pull request.</p>
                    </SectionMessage>
                </Padding>
            );
        }

        return null;
    }
}