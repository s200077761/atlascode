import React, { useState } from "react";
import Button from "@atlaskit/button";
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { DetailedSiteInfo, SiteInfo, AuthInfo, emptyUserInfo, ProductBitbucket } from "../../../atlclients/authInfo";
import AuthForm from "./AuthForm";
import TableTree from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';

interface BBAuthProps {
    sites: DetailedSiteInfo[];
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

export const BBAuth: React.FunctionComponent<BBAuthProps> = ({ sites, handleDeleteSite, handleSaveSite }) => {
    const [addingSite, setAddingSite] = useState(false);

    const handleCloud = () => {
        handleSaveSite({ hostname: "www.bitbucket.org", product: ProductBitbucket },
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
                    product={ProductBitbucket} />
            }
            <div className='ac-vpadding'>
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button className="ac-button" style={{ marginRight: '4px' }} onClick={handleCloud}>Log in to Bitbucket Cloud</Button>
                    <Button className="ac-button" onClick={() => setAddingSite(true)}>Add Custom Bitbucket Site</Button>
                </div>
            </div>
            <TableTree
                headers={['Site Name', '']}
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

