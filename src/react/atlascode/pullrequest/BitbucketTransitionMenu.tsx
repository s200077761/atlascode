import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Grid, makeStyles, Switch, Theme, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { BitbucketIssue } from '../../../bitbucket/model';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';
import StatusMenu from '../bbissue/StatusMenu';

const useStyles = makeStyles((theme: Theme) => ({
    leftBorder: (props: VSCodeStyles) => ({
        marginLeft: theme.spacing(1),
        borderLeftWidth: 'initial',
        borderLeftStyle: 'solid',
        borderLeftColor: props.settingsModifiedItemIndicator,
    }),
}));

type BitbucketTransitionMenuProps = {
    issue: BitbucketIssue;
    handleIssueTransition: (issueToTransition: BitbucketIssue, transition: string) => void;
    onShouldTransitionChange: (issueId: string, shouldChange: boolean) => void;
};

export const BitbucketTransitionMenu: React.FC<BitbucketTransitionMenuProps> = ({
    issue,
    handleIssueTransition,
    onShouldTransitionChange,
}) => {
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useStyles(vscStyles);
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(true);

    const toggleTransitionIssueEnabled = useCallback(() => {
        setTransitionIssueEnabled(!transitionIssueEnabled);
    }, [transitionIssueEnabled]);

    const handleIssueTransitionChange = useCallback(
        async (value: string) => {
            setTransitionIssueEnabled(true);
            handleIssueTransition(issue, value);
        },
        [issue, handleIssueTransition]
    );

    useEffect(() => {
        onShouldTransitionChange(issue.data.id, transitionIssueEnabled);
    }, [issue.data.id, transitionIssueEnabled, onShouldTransitionChange]);

    return (
        <Grid container spacing={2} direction="column">
            <Grid item>
                <ToggleWithLabel
                    label="Transition issue"
                    variant="h4"
                    spacing={1}
                    control={
                        <Switch
                            color="primary"
                            size="small"
                            checked={transitionIssueEnabled}
                            onChange={toggleTransitionIssueEnabled}
                        />
                    }
                />
            </Grid>
            <Grid item container spacing={2} direction="column" className={classes.leftBorder}>
                <Grid item>
                    <Typography>
                        <strong>#{issue.data.id}</strong>
                    </Typography>
                </Grid>

                <Grid item>
                    <StatusMenu
                        fullWidth
                        variant={'outlined'}
                        label={'Transition issue'}
                        status={issue.data.state}
                        onChange={handleIssueTransitionChange}
                    />
                </Grid>
            </Grid>
        </Grid>
    );
};
