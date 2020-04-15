import { SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, makeStyles, Theme, Typography } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection } from '../../../../../lib/ipc/models/config';
import { IntervalInput } from '../../../common/IntervalInput';
import { useBorderBoxStyles } from '../../../common/useBorderBoxStyles';
import { ConfigControllerContext } from '../../configController';
import { PipelinesExplorerOptions } from './PipelineExplorerOptions';
import { PipelineFilterListEditor } from './PipelineFilterListEditor';

type PipelinesExplorerProps = {
    enabled: boolean;
    monitorEnabled: boolean;
    hideEmpty: boolean;
    hideFiltered: boolean;
    refreshInterval: number;
    filters: string[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            indent: {
                marginLeft: theme.spacing(3),
            },
        } as const)
);

export const PipelinesExplorer: React.FunctionComponent<PipelinesExplorerProps> = memo(
    ({ enabled, hideEmpty, hideFiltered, monitorEnabled, refreshInterval, filters }) => {
        const classes = useStyles();
        const boxClass = useBorderBoxStyles();
        const controller = useContext(ConfigControllerContext);

        const [changes, setChanges] = useState<{ [key: string]: any }>({});

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.${e.target.value}`] = e.target.checked;
            setChanges(changes);
        }, []);

        const handleInterval = useCallback((n: number) => {
            const changes = Object.create(null);
            changes[`${ConfigSection.Bitbucket}.pipelines.refreshInterval`] = n;
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
                <PipelinesExplorerOptions
                    enableItem={
                        <Grid item>
                            <SwitchWithLabel
                                label={enabled ? 'Disable pipelines explorer' : 'Enable pipelines Explorer'}
                                color="primary"
                                size="small"
                                value="pipelines.explorerEnabled"
                                checked={enabled}
                                onChange={handleChange}
                                tooltipProps={{
                                    title: enabled ? 'Disable pipelines explorer' : 'Enable pipelines Explorer',
                                }}
                            />
                        </Grid>
                    }
                    monitorItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Show notifications when new Bitbucket pipelines are created"
                                color="primary"
                                size="small"
                                value="pipelines.monitorEnabled"
                                checked={monitorEnabled}
                                onChange={handleChange}
                                tooltipProps={{
                                    title: monitorEnabled ? `Disable notifications` : `Enable notifications`,
                                }}
                            />
                        </Grid>
                    }
                    hideEmptyItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Hide Bitbucket pipelines with no results"
                                color="primary"
                                size="small"
                                checked={hideEmpty}
                                value="pipelines.hideEmpty"
                                onChange={handleChange}
                                tooltipProps={{
                                    title: hideEmpty ? `Hide empty pipelines` : `Show empty pipelines`,
                                }}
                            />
                        </Grid>
                    }
                    hideFilteredItem={
                        <Grid item>
                            <SwitchWithLabel
                                className={classes.indent}
                                disabled={!enabled}
                                label="Show only Bitbucket pipelines matching the filters below"
                                color="primary"
                                size="small"
                                checked={hideFiltered}
                                value="pipelines.hideFiltered"
                                onChange={handleChange}
                                tooltipProps={{
                                    title: hideFiltered ? `Disable filters` : `Enable filters`,
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
                        <Typography variant="h4">Pipeline Filters</Typography>

                        <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                            <PipelineFilterListEditor enabled={hideFiltered} filters={filters} />
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        );
    }
);
