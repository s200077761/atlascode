import { InlineTextEditorList, ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, Switch, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useBorderBoxStyles } from '../common/useBorderBoxStyles';
import { ConfigControllerContext } from './configController';

type StartWorkSettings = {
    includeIssueKey: boolean;
    includeIssueDescription: boolean;
    useCustomPrefixes: boolean;
    customPrefixes: string[];
};

export const StartWorkSettings: React.FunctionComponent<StartWorkSettings> = ({
    includeIssueKey,
    includeIssueDescription,
    useCustomPrefixes,
    customPrefixes,
}) => {
    const controller = useContext(ConfigControllerContext);
    const boxClass = useBorderBoxStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes[`jira.startWork.${e.target.value}`] = e.target.checked;
        setChanges(changes);
    }, []);

    const handleOptionsChange = useCallback((newOptions: string[]) => {
        const changes = Object.create(null);
        changes['jira.startWork.customPrefixes'] = newOptions;
        setChanges(changes);
    }, []);

    const customPrefixesDisabled = !useCustomPrefixes;

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <Grid container direction="column">
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            size="small"
                            color="primary"
                            id="includeIssueKeyInLocalBranch"
                            value="includeIssueKeyInLocalBranch"
                            checked={includeIssueKey}
                            onChange={handleChange}
                        />
                    }
                    label={`Include issue key in auto-generated branch names`}
                    spacing={1}
                    variant="body1"
                />
            </Grid>
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            size="small"
                            color="primary"
                            id="includeIssueDescriptionInLocalBranch"
                            value="includeIssueDescriptionInLocalBranch"
                            checked={includeIssueDescription}
                            onChange={handleChange}
                        />
                    }
                    label={`Include summary in auto-generated branch names`}
                    spacing={1}
                    variant="body1"
                />
            </Grid>
            <Grid item>
                <ToggleWithLabel
                    control={
                        <Switch
                            size="small"
                            color="primary"
                            id="useCustomPrefixes"
                            value="useCustomPrefixes"
                            checked={useCustomPrefixes}
                            onChange={handleChange}
                        />
                    }
                    label={`Use custom branch prefixes`}
                    spacing={1}
                    variant="body1"
                />
            </Grid>
            <Grid item>
                <Box marginTop={2}>
                    <Typography variant="h4">Custom Prefixes</Typography>

                    <Typography variant="caption">
                        Branch names begin with prefixes. E.g. <code>{'{PREFIX}{ISSUEKEY}-{SUMMARY}'}</code>
                    </Typography>

                    <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                        <InlineTextEditorList
                            options={customPrefixes}
                            reverseButtons={true}
                            addOptionButtonContent="Add Custom Prefix"
                            disabled={customPrefixesDisabled}
                            inputLabel="Custom Prefix Text"
                            onChange={handleOptionsChange}
                            emptyComponent={
                                <Box width="100%">
                                    <Typography align="center">No prefixes found.</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};
