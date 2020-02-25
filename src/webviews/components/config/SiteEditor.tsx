import Button from '@atlaskit/button';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import React, { useState } from 'react';
import {
    AuthInfo,
    DetailedSiteInfo,
    emptyUserInfo,
    Product,
    ProductJira,
    SiteInfo
} from '../../../atlclients/authInfo';
import AuthForm from './AuthForm';

interface AuthProps {
    sites: DetailedSiteInfo[];
    product: Product;
    isRemote: boolean;
    handleDeleteSite: (site: DetailedSiteInfo) => void;
    handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
    siteExample?: string;
    cloudOrServer?: string;
}

type ItemData = {
    site: DetailedSiteInfo;
    delfunc: (site: DetailedSiteInfo) => void;
};

const Name = (data: ItemData) => <p style={{ display: 'inline' }}>{data.site.name}</p>;

const Delete = (data: ItemData) => {
    return (
        <React.Fragment>
            <Tooltip content={`Delete ${data.site.name}`}>
                <div className="ac-delete" onClick={() => data.delfunc(data.site)}>
                    <TrashIcon label="trash" />
                </div>
            </Tooltip>
        </React.Fragment>
    );
};

export const SiteEditor: React.FunctionComponent<AuthProps> = ({
    sites,
    product,
    isRemote,
    handleDeleteSite,
    handleSaveSite,
    siteExample,
    cloudOrServer
}) => {
    const [addingSite, setAddingSite] = useState(false);
    const loginText = `Login to ${product.name} Cloud`;
    const addSiteText = `Add Custom ${product.name} Site`;

    const handleCloudProd = () => {
        const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        handleSaveSite({ host: hostname, product: product }, { user: emptyUserInfo });
    };

    const handleSave = (site: SiteInfo, auth: AuthInfo) => {
        handleSaveSite(site, auth);
        setAddingSite(false);
    };

    const generateLoginButtons = () => {
        if (cloudOrServer === undefined) {
            return (
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px' }}>
                    <Button
                        className="ac-button"
                        isDisabled={isRemote}
                        style={{ marginRight: '4px' }}
                        onClick={handleCloudProd}
                    >
                        {loginText}
                    </Button>
                    <Button className="ac-button" isDisabled={isRemote} onClick={() => setAddingSite(true)}>
                        {addSiteText}
                    </Button>
                </div>
            );
        } else if (cloudOrServer === 'cloud') {
            return (
                <Button
                    className="ac-button"
                    isDisabled={isRemote}
                    style={{ marginRight: '4px', display: 'block', width: '100%' }}
                    onClick={handleCloudProd}
                >
                    {loginText}
                </Button>
            );
        } else {
            return (
                <Button
                    className="ac-button"
                    isDisabled={isRemote}
                    style={{ marginRight: '4px', display: 'block', width: '100%' }}
                    onClick={() => setAddingSite(true)}
                >
                    {addSiteText}
                </Button>
            );
        }
    };

    const getTreeItems = () => {
        if (sites.length > 0) {
            return sites.map(site => {
                return {
                    id: site.id,
                    content: {
                        site: site,
                        delfunc: handleDeleteSite
                    }
                };
            });
        } else {
            return [{ id: 1, content: { site: `No sites currently authenticated` } }];
        }
    };

    return (
        <React.Fragment>
            {addingSite && <AuthForm onCancel={() => setAddingSite(false)} onSave={handleSave} product={product} />}
            <div className="ac-vpadding">
                {isRemote && (
                    <div className="ac-vpadding">
                        <p>Authentication cannot be done while running remotely.</p>
                        <p>
                            To authenticate with a new site open this (or another) workspace locally. Accounts added
                            when running locally <em>will</em> be accessible during remote development.
                        </p>
                    </div>
                )}
                {generateLoginButtons()}
                {cloudOrServer !== undefined && <p style={{ float: 'right' }}>{siteExample}</p>}
            </div>
            <div style={{ marginTop: '8px' }}>
                <TableTree
                    columns={sites.length > 0 ? [Name, Delete] : [Name]}
                    columnWidths={['100%', '20px']}
                    items={getTreeItems()}
                />
            </div>
        </React.Fragment>
    );
};
