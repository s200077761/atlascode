import { IconLink } from '@atlassianlabs/guipi-core-components';
import { Button, Grid } from '@material-ui/core';
import React, { memo, useContext } from 'react';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import BitbucketIcon from '../icons/BitbucketIcon';
import { ConfigControllerContext } from './configController';

type SidebarButtonProps = {};

export const SidebarButtons: React.FunctionComponent<SidebarButtonProps> = memo(({}) => {
    const controller = useContext(ConfigControllerContext);

    return (
        <Grid container direction="column" alignItems="center">
            <Grid item>
                <Grid container spacing={2} direction="column" alignItems="flex-start">
                    <Grid item>
                        <Button variant="contained" color="primary">
                            Send Feedback
                        </Button>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeRepo)}
                            startIcon={<BitbucketIcon />}
                        >
                            Source Code
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeIssues)}
                            startIcon={<BitbucketIcon />}
                        >
                            Got Issues?
                        </IconLink>
                    </Grid>
                    <Grid item>
                        <IconLink
                            href="#"
                            onClick={() => controller.openLink(KnownLinkID.AtlascodeDocs)}
                            startIcon={<BitbucketIcon />}
                        >
                            User Guide
                        </IconLink>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
});
