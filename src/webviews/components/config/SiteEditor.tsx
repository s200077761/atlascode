import React, { useState } from "react";
import Button from "@atlaskit/button";
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { DetailedSiteInfo, SiteInfo, AuthInfo, emptyUserInfo, Product, ProductJira } from "../../../atlclients/authInfo";
import AuthForm from "./AuthForm";
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';

interface AuthProps {
    sites: DetailedSiteInfo[];
    product: Product;
    handleDeleteSite: (site: DetailedSiteInfo) => void;
    handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
}

type ItemData = {
    site: DetailedSiteInfo;
    delfunc: (site: DetailedSiteInfo) => void;
};

const Name = (data: ItemData) => <p style={{ display: "inline" }}>{data.site.name}</p>;

const Delete = (data: ItemData) => {
    return (
        <React.Fragment>
            <Tooltip content={`Delete ${data.site.name}`}>
                <div className='ac-delete' onClick={() => data.delfunc(data.site)}>
                    <TrashIcon label='trash' />
                </div>
            </Tooltip>
        </React.Fragment>
    );
};

export const SiteEditor: React.FunctionComponent<AuthProps> = ({ sites, product, handleDeleteSite, handleSaveSite }) => {
    const [addingSite, setAddingSite] = useState(false);
    const loginText = `Login to ${product.name} Cloud`;
    const addSiteText = `Add Custom ${product.name} Site`;

    const handleCloudProd = () => {
        const hostname = (product.key === ProductJira.key) ? 'atlassian.net' : 'bitbucket.org';
        handleSaveSite({ hostname: hostname, product: product },
            { user: emptyUserInfo });
    };

    const handleSave = (site: SiteInfo, auth: AuthInfo) => {
        handleSaveSite(site, auth);
        setAddingSite(false);
    };

    return (
        <React.Fragment>
            {addingSite &&
                <AuthForm
                    onCancel={() => setAddingSite(false)}
                    onSave={handleSave}
                    product={product} />
            }
            <div className='ac-vpadding'>
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button className="ac-button" style={{ marginRight: '4px' }} onClick={handleCloudProd}>{loginText}</Button>
                    <Button className="ac-button" onClick={() => setAddingSite(true)}>{addSiteText}</Button>
                </div>
            </div>
            <TableTree
                columns={[Name, Delete]}
                columnWidths={['100%', '20px']}
                items={sites.map(site => {
                    return {
                        id: site.id,
                        content: {
                            site: site,
                            delfunc: handleDeleteSite,
                        }
                    };
                })}
            />

        </React.Fragment>
    );
};

