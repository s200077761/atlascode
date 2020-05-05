import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Container, Grid, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import BitbucketIcon from '../icons/BitbucketIcon';
import { AltProductEnabler } from './AltProductEnabler';

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    selectionTitleText: {
        color: theme.palette.type === 'dark' ? 'white' : '#47525c',
    },
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
    bitbucketEnabled,
}) => {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <Grid container spacing={3} justify="center" alignItems={'stretch'}>
                <Grid item xs={12}>
                    <Typography variant="h1" align="center" className={classes.selectionTitleText}>
                        Select the products you want to enable
                    </Typography>
                </Grid>
                <Grid item lg={6} md={10} sm={12} xs={12}>
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltProductEnabler
                            label="Jira"
                            enabled={jiraEnabled}
                            onToggle={jiraToggleHandler}
                            subtext="Create and view Jira issues within VS Code"
                            ProductIcon={<JiraIcon fontSize={'inherit'} />}
                        />
                    </Container>
                </Grid>
                <Grid item lg={6} md={10} sm={12} xs={12}>
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltProductEnabler
                            label="Bitbucket"
                            enabled={bitbucketEnabled}
                            onToggle={bitbucketToggleHandler}
                            subtext="Pull requests, issues, and pipelines all within VS Code"
                            ProductIcon={<BitbucketIcon color={'primary'} fontSize={'inherit'} />}
                        />
                    </Container>
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
