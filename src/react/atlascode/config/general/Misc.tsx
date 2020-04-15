import { SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, MenuItem, TextField } from '@material-ui/core';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { ConfigControllerContext } from '../configController';

export enum OutputLevelOption {
    SILENT = 'silent',
    ERRORS = 'errors',
    INFO = 'info',
    DEBUG = 'debug',
}

type MiscProps = {
    showWelcome: boolean;
    outputLevel: OutputLevelOption;
};

export const Misc: React.FunctionComponent<MiscProps> = memo(({ showWelcome, outputLevel }) => {
    const controller = useContext(ConfigControllerContext);

    const [changes, setChanges] = useState<{ [key: string]: any }>({});

    const handleWelcomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['showWelcomeOnInstall'] = e.target.checked;
        setChanges(changes);
    }, []);

    const handleOutputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['outputLevel'] = e.target.value;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <Grid container direction="column" spacing={3}>
            <Grid item>
                <SwitchWithLabel
                    size="small"
                    color="primary"
                    id="showWelcome"
                    checked={showWelcome}
                    onChange={handleWelcomeChange}
                    label="Show welcome screen when extension is updated"
                />
            </Grid>
            <Grid item>
                <Box width={200}>
                    <TextField
                        select
                        fullWidth
                        value={outputLevel}
                        name="outputLevel"
                        id="outputLevel"
                        onChange={handleOutputChange}
                        label="Output Level"
                    >
                        <MenuItem key={OutputLevelOption.SILENT} value={OutputLevelOption.SILENT}>
                            {OutputLevelOption.SILENT}
                        </MenuItem>
                        <MenuItem key={OutputLevelOption.ERRORS} value={OutputLevelOption.ERRORS}>
                            {OutputLevelOption.ERRORS}
                        </MenuItem>
                        <MenuItem key={OutputLevelOption.INFO} value={OutputLevelOption.INFO}>
                            {OutputLevelOption.INFO}
                        </MenuItem>
                        <MenuItem key={OutputLevelOption.DEBUG} value={OutputLevelOption.DEBUG}>
                            {OutputLevelOption.DEBUG}
                        </MenuItem>
                    </TextField>
                </Box>
            </Grid>
        </Grid>
    );
});
