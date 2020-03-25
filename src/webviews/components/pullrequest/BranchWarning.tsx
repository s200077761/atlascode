import SectionMessage from '@atlaskit/section-message';
import React from 'react';
import { Branch } from '../../../typings/git';

type BranchWarningProps = {
    sourceBranch: Branch | undefined;
    sourceRemoteBranchName: string | undefined;
    remoteBranches: Branch[];
    hasLocalChanges: boolean | undefined;
};

export const BranchWarning: React.FunctionComponent<BranchWarningProps> = (props: BranchWarningProps) => {
    if (!props.sourceBranch || !props.sourceRemoteBranchName) {
        return null;
    }

    const localChangesWarning = props.hasLocalChanges ? (
        <SectionMessage appearance="warning" title="There are uncommitted changes for this repo">
            <p>Ensure the changes that need to be included are committed before creating the pull request.</p>
        </SectionMessage>
    ) : null;

    const remoteBranch = props.remoteBranches.find(remoteBranch => props.sourceRemoteBranchName === remoteBranch.name);
    const upstreamBranchWarning = !remoteBranch ? (
        <SectionMessage appearance="warning" title={`Upstream branch (${props.sourceRemoteBranchName}) not found`}>
            <p>
                Ensure that the checkbox above is checked to push the local changes to remote while creating the pull
                request.
            </p>
        </SectionMessage>
    ) : null;

    const upstreamBranchStaleWarning =
        remoteBranch && props.sourceBranch.commit !== remoteBranch.commit ? (
            <SectionMessage appearance="warning" title="Upstream branch not up to date">
                <p>
                    Upstream branch ({props.sourceRemoteBranchName}) commit hash does not match with local branch (
                    {props.sourceBranch.name})
                </p>
                <p>
                    Ensure that the checkbox above is checked to push the local changes to remote while creating the
                    pull request
                </p>
            </SectionMessage>
        ) : null;

    return (
        <React.Fragment>
            {localChangesWarning}
            {upstreamBranchWarning}
            {upstreamBranchStaleWarning}
        </React.Fragment>
    );
};
