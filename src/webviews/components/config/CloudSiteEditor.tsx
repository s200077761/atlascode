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
    isRemote: boolean;
    handleDeleteSite: (site: DetailedSiteInfo) => void;
    handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
    siteExample: string;
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

export const CloudSiteEditor: React.FunctionComponent<AuthProps> = ({ sites, product, isRemote, handleDeleteSite, handleSaveSite, siteExample }) => {
    const [addingSite, setAddingSite] = useState(false);
    const loginText = `Log in to ${product.name} Cloud`;

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
                {isRemote &&
                    <div className='ac-vpadding'>
                        <p>Authentication cannot be done while running remotely.</p>
                        <p>To authenticate with a new site open this (or another) workspace locally. Accounts added when running locally <em>will</em> be accessible during remote development.</p>
                    </div>
                }
                <Button className="ac-button" isDisabled={isRemote} style={{ marginRight: '4px', display: 'block', width: '100%' }} onClick={handleCloudProd}>{loginText}</Button>
                <p style={{float: 'right'}}>{siteExample}</p>
            </div>
            <div style={{marginTop: '8px'}}>
                {sites.length > 0 &&
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
                }
                {sites.length === 0 && 
                    <TableTree
                        columns={[Name]}
                        columnWidths={['100%', '20px']}
                        items={[{id: 1, content: { site: `No sites currently authenticated` }}]}
                    />
                }
            </div>
        </React.Fragment>
    );
};

