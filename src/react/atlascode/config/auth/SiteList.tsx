import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import {
    Avatar,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Theme
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import makeStyles from '@material-ui/styles/makeStyles';
import React, { useContext } from 'react';
import { uid } from 'react-uid';
import { DetailedSiteInfo, Product } from '../../../../atlclients/authInfo';
import { ResourceContext } from '../../../resourceContext';
import { ConfigControllerContext } from '../configController';

type SiteListProps = {
    product: Product;
    sites: DetailedSiteInfo[];
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                flexGrow: 1
            }
        } as const)
);

function generateListItems(
    product: Product,
    sites: DetailedSiteInfo[],
    logout: (site: DetailedSiteInfo) => void,
    scheme: string
): JSX.Element[] {
    const fallbackImg = `${scheme}images/${product.key}-icon.svg`;

    return sites.map((site: DetailedSiteInfo, i: number) => {
        const avatarUrl = site.avatarUrl && site.avatarUrl.length > 0 ? site.avatarUrl : fallbackImg;

        return (
            <React.Fragment key={uid(site, i)}>
                <ListItem key={site.name}>
                    <ListItemAvatar>
                        <Avatar src={avatarUrl}>
                            <JiraIcon />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={site.name} />
                    <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="delete" onClick={() => logout(site)}>
                            <DeleteIcon fontSize="small" color="inherit" />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
                {sites.length !== i + 1 && <Divider />}
            </React.Fragment>
        );
    });
}

export const SiteList: React.FunctionComponent<SiteListProps> = ({ sites, product }) => {
    const scheme: string = useContext(ResourceContext);
    const controller = useContext(ConfigControllerContext);

    const classes = useStyles();

    return (
        <div className={classes.root}>
            <List>{generateListItems(product, sites, controller.logout, scheme)}</List>
        </div>
    );
};
