import Button from '@atlaskit/button';
import EditIcon from '@atlaskit/icon/glyph/edit';
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
import { emptySiteAuthInfo, SiteAuthInfo } from '../../../ipc/configMessaging';
import AuthForm from './AuthForm';

interface AuthProps {
    sites: SiteAuthInfo[];
    product: Product;
    isRemote: boolean;
    handleDeleteSite: (site: DetailedSiteInfo) => void;
    handleEditSite?: (site: DetailedSiteInfo, auth: AuthInfo) => void;
    handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
    siteExample?: string;
    cloudOrServer?: string;
}

type ItemData = {
    site: SiteAuthInfo;
    delfunc: (site: DetailedSiteInfo) => void;
    editfunc: (site: SiteAuthInfo) => void;
};

const Name = (data: ItemData) => <p style={{ display: 'inline' }}>{data.site.site.name}</p>;

const Delete = (data: ItemData) => {
    return (
        <React.Fragment>
            <Tooltip content={`Delete ${data.site.site.name}`}>
                <div className="ac-delete" onClick={() => data.delfunc(data.site.site)}>
                    <TrashIcon label="trash" />
                </div>
            </Tooltip>
        </React.Fragment>
    );
};

const Edit = (data: ItemData) => {
    if (data.editfunc) {
        return (
            <React.Fragment>
                <Tooltip content={`Edit ${data.site.site.name}`}>
                    <div className="ac-edit" onClick={() => data.editfunc(data.site)}>
                        <EditIcon label="edit" />
                    </div>
                </Tooltip>
            </React.Fragment>
        );
    }
    return <React.Fragment />;
};

export const SiteEditor: React.FunctionComponent<AuthProps> = ({
    sites,
    product,
    isRemote,
    handleDeleteSite,
    handleEditSite,
    handleSaveSite,
    siteExample,
    cloudOrServer
}) => {
    const [addingSite, setAddingSite] = useState(false);
    const [editingSite, setEditingSite] = useState(emptySiteAuthInfo);
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

    const handleEdit = (site: SiteAuthInfo) => {
        if (handleEditSite) {
            setEditingSite(site);
        }
    };

    const completeEdit = (site: DetailedSiteInfo, auth: AuthInfo) => {
        if (handleEditSite) {
            handleEditSite(site, auth);
            setEditingSite(emptySiteAuthInfo);
        }
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
            return sites.map(siteInfo => {
                return {
                    id: siteInfo.site.id,
                    content: {
                        site: siteInfo,
                        delfunc: handleDeleteSite,
                        editfunc: handleEditSite && siteInfo.site.isCloud ? undefined : handleEdit
                    }
                };
            });
        } else {
            return [{ id: 1, content: { site: { site: { name: `No sites currently authenticated` } } } }];
        }
    };

    return (
        <React.Fragment>
            {addingSite && <AuthForm onCancel={() => setAddingSite(false)} onSave={handleSave} product={product} />}
            {editingSite !== emptySiteAuthInfo && (
                <AuthForm
                    site={editingSite.site}
                    auth={editingSite.auth}
                    onCancel={() => setEditingSite(emptySiteAuthInfo)}
                    onSave={completeEdit}
                    product={product}
                />
            )}
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
                    columns={sites.length > 0 ? [Name, Edit, Delete] : [Name]}
                    columnWidths={['100%', '20px', '20px']}
                    items={getTreeItems()}
                />
            </div>
        </React.Fragment>
    );
};
