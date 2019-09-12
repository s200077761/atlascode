import React, { useState } from "react";
import Button from "@atlaskit/button";
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { DetailedSiteInfo, SiteInfo, AuthInfo, ProductJira, emptyUserInfo } from "../../../atlclients/authInfo";
import AuthForm from "./AuthForm";
import TableTree from '@atlaskit/table-tree';
import Lozenge from "@atlaskit/lozenge";
import Tooltip from '@atlaskit/tooltip';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import Spinner from '@atlaskit/spinner';
import { ValueType } from "../../../jira/jira-client/model/fieldUI";
import { SelectFieldHelper } from "../selectFieldHelper";
import { AsyncSelect } from '@atlaskit/select';
import { debounce } from "lodash";
import { Project } from "../../../jira/jira-client/model/entities";
import { JiraSiteProjectMapping } from "../../../jira/projectManager";

interface JiraAuthProps {
    sites: DetailedSiteInfo[];
    defaultSite: string;
    siteProjectMapping: JiraSiteProjectMapping;
    handleDeleteSite: (site: DetailedSiteInfo) => void;
    handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
    handleDefaultSite: (site: DetailedSiteInfo) => void;
    handleDefaultProject: (site: DetailedSiteInfo, project: Project) => void;
    loadProjectOptions: (site: DetailedSiteInfo, input: string) => Promise<any>;
}

type ItemData = {
    site: DetailedSiteInfo;
    isDefault: boolean;
    defaultProject: Project | undefined;
    delfunc: (site: DetailedSiteInfo) => void;
    setDefault: (site: DetailedSiteInfo) => void;
    setLoading: (siteId: string) => void;
    loading: boolean;
    loadProjectOptions: (site: DetailedSiteInfo, input: string) => Promise<any>;
    handleDefaultProject: (site: DetailedSiteInfo, project: Project) => void;
};

const Name = (data: ItemData) => <p style={{ display: "inline" }}>{data.site.name}</p>;
const Default = (data: ItemData) => {

    if (data.isDefault) {
        return (<Lozenge appearance='success'>default site</Lozenge>);
    }

    if (data.loading) {
        return (<Spinner size="small" />);
    }

    return (
        <Tooltip content={`Set ${data.site.name} as default site`}>
            <div className='ac-icon-button' onClick={() => {
                data.setLoading(data.site.id);
                data.setDefault(data.site);
            }}>
                <div className='ac-flex'>
                    <CheckCircleOutlineIcon label="setasdefault" />
                    <span style={{ marginLeft: '8px' }}>set as default</span>
                </div>
            </div>
        </Tooltip>
    );

};
const Project = (data: ItemData) => {

    const commonSelectProps: any = {
        isMulti: false,
        className: "ac-select-container",
        classNamePrefix: "ac-select",
        getOptionLabel: SelectFieldHelper.labelFuncForValueType(ValueType.Project),
        getOptionValue: SelectFieldHelper.valueFuncForValueType(ValueType.Project),
        components: SelectFieldHelper.getComponentsForValueType(ValueType.Project),
        placeholder: 'Default project',
        noOptionsMessage: (input: any) => { return 'type to search'; },
        defaultValue: data.defaultProject,
        value: data.defaultProject,
    };

    return (
        <div style={{ width: '100%' }}>
            <AsyncSelect
                {...commonSelectProps}
                onChange={debounce((item: any) => { data.handleDefaultProject(data.site, item); }, 100)} //https://github.com/JedWatson/react-select/issues/2326
                loadOptions={(input: string): Promise<any> => {
                    return data.loadProjectOptions(data.site, input);
                }}
            />
        </div>
    );

};

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

export const JiraAuth: React.FunctionComponent<JiraAuthProps> = ({ sites, defaultSite, handleDeleteSite, handleSaveSite, handleDefaultSite, loadProjectOptions, handleDefaultProject, siteProjectMapping }) => {
    const [addingSite, setAddingSite] = useState(false);
    const [loadingSiteId, setLoadingSiteId] = useState('');

    const handleCloud = () => {
        handleSaveSite({ hostname: "www.atlassian.net", product: ProductJira },
            { user: emptyUserInfo });
    };

    const handleSave = (site: SiteInfo, auth: AuthInfo) => {
        handleSaveSite(site, auth);
        setAddingSite(false);
    };
    console.log('rendering sites', sites);
    return (
        <React.Fragment>
            {addingSite &&
                <AuthForm
                    onCancel={() => setAddingSite(false)}
                    onSave={handleSave}
                    product={ProductJira} />
            }
            <div className='ac-vpadding'>
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button className="ac-button" style={{ marginRight: '4px' }} onClick={handleCloud}>Log in to Jira Cloud</Button>
                    <Button className="ac-button" onClick={() => setAddingSite(true)}>Add Custom Jira Site</Button>
                </div>
            </div>
            <TableTree
                headers={['Site Name', 'Default Site', 'Default Project', '']}
                columns={[Name, Default, Project, Delete]}
                columnWidths={['300px', '340px', '680px', '20px']}
                items={sites.map(site => {
                    console.log('default project', siteProjectMapping[site.id]);
                    return {
                        id: site.id,
                        content: {
                            site: site,
                            isDefault: (site.id === defaultSite),
                            delfunc: handleDeleteSite,
                            setDefault: handleDefaultSite,
                            setLoading: setLoadingSiteId,
                            loading: loadingSiteId === site.id,
                            loadProjectOptions: loadProjectOptions,
                            handleDefaultProject: handleDefaultProject,
                            defaultProject: siteProjectMapping[site.id],
                        }
                    };
                })}
            />

        </React.Fragment>
    );
};

