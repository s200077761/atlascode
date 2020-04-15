import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Grid, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import BitbucketIcon from '../icons/BitbucketIcon';
import { AltProductEnabler } from './AltProductEnabler';

const useStyles = makeStyles(theme => ({
    root: {
        flexGrow: 1
    }
}));

export type ProductSelectorProps = {
    bitbucketToggleHandler: (enabled: boolean) => void;
    jiraToggleHandler: (enabled: boolean) => void;
    bitbucketEnabled: boolean;
    jiraEnabled: boolean;
};

export const ProductSelector: React.FunctionComponent<ProductSelectorProps> = ({
    bitbucketToggleHandler,
    jiraToggleHandler,
    jiraEnabled,
    bitbucketEnabled
}) => {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h1" align="center">
                        Select the products you want to enable
                    </Typography>
                </Grid>
                <Grid item xs={6} alignItems={'flex-end'}>
                    <AltProductEnabler
                        label="Jira"
                        enabled={jiraEnabled}
                        onToggle={jiraToggleHandler}
                        subtext="Create and view Jira issues within VS Code"
                        ProductIcon={<JiraIcon fontSize={'inherit'} />}
                    />
                </Grid>
                <Grid item xs={6} alignItems={'flex-end'}>
                    <AltProductEnabler
                        label="Bitbucket"
                        enabled={bitbucketEnabled}
                        onToggle={bitbucketToggleHandler}
                        subtext="Pull requests, issues, and pipelines all within VS Code"
                        ProductIcon={<BitbucketIcon color={'primary'} fontSize={'inherit'} />}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3" align="center">
                        This can be changed later
                    </Typography>
                </Grid>
            </Grid>
        </div>
    );
};

export default ProductSelector;
