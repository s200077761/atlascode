import { SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, makeStyles, Theme } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { ConfigSection } from '../../../../../lib/ipc/models/config';
import { IntervalInput } from '../../../common/IntervalInput';
import { ConfigControllerContext } from '../../configController';
import { JQLListEditor } from '../jql/JQLListEditor';
import { JiraExplorerOptions } from './JiraExplorerOptions';

type JiraExplorerProps = {
    enabled: boolean;
    nestSubtasks: boolean;
    fetchAllQueryResults: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
    jqlList: JQLEntry[];
    sites: DetailedSiteInfo[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3)
            }
        } as const)
);

export const JiraExplorer: React.FunctionComponent<JiraExplorerProps> = memo(
    ({ enabled, nestSubtasks, fetchAllQueryResults, monitorEnabled, refreshInterval, sites, jqlList }) => {
        const classes = useStyles();
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Jira}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleInterval = useCallback((n: number) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Jira}.explorer.refreshInterval`] = n;
            setChanges(changes);
        }, []);

        useEffect(() => {
            if (Object.keys(changes).length > 0) {
                controller.updateConfig(changes);
                setChanges({});
            }
        }, [changes, controller]);

        return (
            <Grid container direction="column" spacing={2}>
                <JiraExplorerOptions
                    enableItem={
                        <Grid item>
                            <SwitchWithLabel
                                label={enabled ? 'Disable Jira explorer' : 'Enable Jira Explorer'}
                                color="primary"
                                size="small"
                                value="explorer.enabled"
                                checked={enabled}
                                onChange={handleChange}
                                tooltipProps={{ title: enabled ? 'Disable Jira explorer' : 'Enable Jira Explorer' }}
                            />
                        </Grid>
                    }
                    groupItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Group issues by epic"
                                color="primary"
                                size="small"
                                value="explorer.nestSubtasks"
                                checked={nestSubtasks}
                                onChange={handleChange}
                                tooltipProps={{
                                    title: nestSubtasks ? `Disable issue grouping` : `Enable issue grouping`
                                }}
                            />
                        </Grid>
                    }
                    fetchAllItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Fetch all JQL query results (default is 100, enabling this could cause performance issues)"
                                color="primary"
                                size="small"
                                checked={fetchAllQueryResults}
                                value="explorer.fetchAllQueryResults"
                                onChange={handleChange}
                                tooltipProps={{
                                    title: fetchAllQueryResults ? `Limit to 100 results` : `Fetch all results`
                                }}
                            />
                        </Grid>
                    }
                    notifyItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Show notifications when new issues are created matching  the JQLs/Filters below"
                                color="primary"
                                size="small"
                                checked={monitorEnabled}
                                value="explorer.monitorEnabled"
                                onChange={handleChange}
                                tooltipProps={{
                                    title: monitorEnabled ? `Disable notification` : `Enable Notifications`
                                }}
                            />
                        </Grid>
                    }
                    intervalItem={
                        <Grid item>
                            <IntervalInput
                                className={classes.indent}
                                interval={refreshInterval}
                                max={120}
                                label="Refresh interval:"
                                enabled={enabled}
                                units="minutes"
                                onChange={handleInterval}
                            />
                        </Grid>
                    }
                />
                <Grid item>
                    <Box marginTop={2}>
                        <JQLListEditor sites={sites} jqlList={jqlList} />
                    </Box>
                </Grid>
            </Grid>
        );
    }
);
