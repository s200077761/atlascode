import { Checkbox } from '@atlaskit/checkbox';
import { CheckboxField } from '@atlaskit/form';
import Tooltip from '@atlaskit/tooltip';
import { Filter } from '@atlassianlabs/jira-pi-common-models/entities';
import * as React from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { IConfig } from '../../../config/model';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { chain } from '../fieldValidators';
import CustomJQL from './CustomJQL';

type changeObject = { [key: string]: any };

export default class JiraExplorer extends React.Component<{
    config: IConfig,
    jqlFetcher: (site: DetailedSiteInfo, path: string) => Promise<any>,
    jiraFilterFetcher: (site: DetailedSiteInfo) => void,
    jiraFilterSearcher: (site: DetailedSiteInfo, query: string) => Promise<Filter[]>;
    sites: DetailedSiteInfo[],
    filters: { [k: string]: Filter[] },
    filterSearches: { [k: string]: Filter[] },
    onConfigChange: (changes: changeObject, removes?: string[]) => void
}, ConfigData> {

    constructor(props: any) {
        super(props);

        this.state = emptyConfigData;
    }

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    };

    handleNumberChange = (e: any, configKey: string) => {
        const changes = Object.create(null);
        changes[configKey] = +e.target.value;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    };

    getIsExplorerIndeterminate = (): boolean => {
        if (!this.props.config.jira.explorer.enabled) {
            return false;
        }

        let count = 0;
        if (this.props.config.jira.explorer.showAssignedIssues) {
            count++;
        }
        if (this.props.config.jira.explorer.showOpenIssues) {
            count++;
        }

        return (count < 2);
    };

    render() {
        const config = this.props.config;
        return (

            <div>
                <CheckboxField
                    name='issue-explorer-enabled'
                    id='issue-explorer-enabled'
                    value='jira.explorer.enabled'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Jira Issue Explorer'
                                    isIndeterminate={this.getIsExplorerIndeterminate()}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.props.config.jira.explorer.enabled}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <CheckboxField
                    name='issue-explorer-nestSubtasks'
                    id='issue-explorer-nestSubtasks'
                    value='jira.explorer.nestSubtasks'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Group issues by Epic'
                                    isIndeterminate={this.getIsExplorerIndeterminate()}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.props.config.jira.explorer.nestSubtasks}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <CheckboxField
                    name='issue-explorer-fetchAllQueryResults'
                    id='issue-explorer-fetchAllQueryResults'
                    value='jira.explorer.fetchAllQueryResults'>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Fetch all JQL query results (default is 100, enabling this could cause performance issues)'
                                    isIndeterminate={this.getIsExplorerIndeterminate()}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isChecked={this.props.config.jira.explorer.fetchAllQueryResults}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '24px',
                    paddingTop: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{ marginRight: '10px' }}>
                            <h4>Custom JQL</h4>
                        </div>
                        <Tooltip content="Use JQL to populate the 'JIRA ISSUES' panel in the sidebar">
                            <a href="https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14">
                                What is JQL?
                            </a>
                        </Tooltip>
                    </div>
                    <CustomJQL
                        JqlList={config.jira.jqlList}
                        onConfigChange={this.props.onConfigChange}
                        jqlFetcher={this.props.jqlFetcher}
                        jiraFilterFetcher={this.props.jiraFilterFetcher}
                        jiraFilterSearcher={this.props.jiraFilterSearcher}
                        sites={this.props.sites}
                        jiraFilters={this.props.filters}
                        jiraFilterSearches={this.props.filterSearches} />
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '24px',
                    paddingTop: '10px'
                }}>
                    <CheckboxField
                        name="jira-explorer-monitor-enabled"
                        id="jira-explorer-monitor-enabled"
                        value="jira.explorer.monitorEnabled"
                    >
                        {(fieldArgs: any) => {
                            return (
                                <Checkbox
                                    {...fieldArgs.fieldProps}
                                    label="Show notifications when new issues are created matching the above JQL(s)"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.config.jira.explorer.enabled}
                                    isChecked={this.props.config.jira.explorer.monitorEnabled}
                                />
                            );
                        }}
                    </CheckboxField>
                </div>
                <div className="refreshInterval">
                    <span>Refresh explorer every: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name="jira-explorer-refresh-interval"
                        type="number" min="0"
                        value={this.props.config.jira.explorer.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, "jira.explorer.refreshInterval")}
                        disabled={!this.props.config.jira.explorer.enabled} />
                    <span> minutes (setting to 0 disables auto-refresh)</span>
                </div>
            </div>

        );
    }
}
