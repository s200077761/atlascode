import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { emptyTransition, MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box, Grid, makeStyles, MenuItem, Switch, TextField, Theme, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { colorToLozengeAppearanceMap } from '../../vscode/theme/colors';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';
import Lozenge from '../common/Lozenge';

const useStyles = makeStyles((theme: Theme) => ({
    leftBorder: (props: VSCodeStyles) => ({
        marginLeft: theme.spacing(1),
        borderLeftWidth: 'initial',
        borderLeftStyle: 'solid',
        borderLeftColor: props.settingsModifiedItemIndicator,
    }),
}));

type JiraTransitionMenuProps = {
    issue: MinimalIssue<DetailedSiteInfo>;
    handleIssueTransition: (issueToTransition: MinimalIssue<DetailedSiteInfo>, transition: Transition) => void;
    onShouldTransitionChange: (issueId: string, shouldChange: boolean) => void;
};

export const JiraTransitionMenu: React.FC<JiraTransitionMenuProps> = ({
    issue,
    handleIssueTransition,
    onShouldTransitionChange,
}) => {
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useStyles(vscStyles);
    const [transition, setTransition] = useState<Transition>(emptyTransition);
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(true);

    const toggleTransitionIssueEnabled = useCallback(() => {
        setTransitionIssueEnabled(!transitionIssueEnabled);
    }, [transitionIssueEnabled]);

    const handleIssueTransitionChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setTransition(event.target.value);
            handleIssueTransition(issue, event.target.value);
            setTransitionIssueEnabled(true);
        },
        [setTransition, handleIssueTransition, issue]
    );

    useEffect(() => {
        if (issue.transitions?.length > 0) {
            setTransition(issue.transitions.find((t) => t.to.id === issue.status.id) || issue.transitions[0]);
        } else {
            setTransition(emptyTransition);
        }
    }, [issue]);

    useEffect(() => {
        onShouldTransitionChange(issue.id, transitionIssueEnabled);
    }, [issue.id, transitionIssueEnabled, onShouldTransitionChange]);

    return issue.transitions?.length < 1 ? (
        <Box />
    ) : (
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
                        <strong>{issue.key}</strong>: {issue.summary}
                    </Typography>
                </Grid>

                <Grid item>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Transition issue"
                        value={transition}
                        onChange={handleIssueTransitionChange}
                    >
                        {(issue.transitions || [emptyTransition]).map((transition) => (
                            //@ts-ignore
                            <MenuItem key={transition.id} value={transition}>
                                <Lozenge
                                    appearance={colorToLozengeAppearanceMap[transition.to.statusCategory.colorName]}
                                    label={transition.to.name}
                                />
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>
        </Grid>
    );
};
