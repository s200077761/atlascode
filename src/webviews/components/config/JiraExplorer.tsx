import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { CheckboxField } from '@atlaskit/form';
import { chain } from '../fieldValidators';
import CustomJQL from './CustomJQL';
import NonCustomJQL from './NonCustomJQL';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';

type changeObject = { [key: string]: any };

export default class JiraExplorer extends React.Component<{
    configData: ConfigData,
    jqlFetcher: (site: DetailedSiteInfo, path: string) => Promise<any>,
    sites: DetailedSiteInfo[],
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
    }

    handleNumberChange = (e: any, configKey: string) => {
        const changes = Object.create(null);
        changes[configKey] = +e.target.value;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    getIsExplorerIndeterminate = (): boolean => {
        if (!this.props.configData.config.jira.explorer.enabled) {
            return false;
        }

        let count = 0;
        if (this.props.configData.config.jira.explorer.showAssignedIssues) {
            count++;
        }
        if (this.props.configData.config.jira.explorer.showOpenIssues) {
            count++;
        }

        return (count < 2);
    }

    selectedSiteName = () => {
        const siteId = this.props.configData.config.jira.defaultSite;
        const site = this.props.sites.find(site => site.id === siteId);
        return site ? site.name : "<default site not set>";
    }

    render() {
        const config = this.props.configData.config;
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
                                    isChecked={this.props.configData.config.jira.explorer.enabled}
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
                    <h4>Common Filters</h4>
                    <NonCustomJQL
                        yourIssuesJql={config.jira.explorer.assignedIssueJql}
                        yourIssuesIsEnabled={config.jira.explorer.showAssignedIssues}
                        openIssuesJql={config.jira.explorer.openIssueJql}
                        openIssuesIsEnabled={config.jira.explorer.showOpenIssues}
                        onConfigChange={this.props.onConfigChange}
                        jqlFetcher={this.props.jqlFetcher}
                        defaultSiteId={config.jira.defaultSite}
                        workingProject={config.jira.workingProject.id}
                        sites={this.props.sites} />
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '24px',
                    paddingTop: '10px'
                }}>
                    <h4>Custom JQL</h4>
                    <CustomJQL
                        siteJqlList={config.jira.customJql}
                        onConfigChange={this.props.onConfigChange}
                        jqlFetcher={this.props.jqlFetcher}
                        defaultSiteName={this.selectedSiteName()}
                        defaultSiteId={config.jira.defaultSite}
                        workingProject={config.jira.workingProject.id}
                        sites={this.props.sites} />
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
                                    label="Show notifications when new issues are created for default site and project"
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                    isDisabled={!this.props.configData.config.jira.explorer.enabled}
                                    isChecked={this.props.configData.config.jira.explorer.monitorEnabled}
                                />
                            );
                        }}
                    </CheckboxField>
                </div>
                <div className="refreshInterval">
                    <span>Refresh explorer every: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name="jira-explorer-refresh-interval"
                        type="number" min="0"
                        value={this.props.configData.config.jira.explorer.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, "jira.explorer.refreshInterval")}
                        disabled={!this.props.configData.config.jira.explorer.enabled} />
                    <span> minutes (setting to 0 disables auto-refresh)</span>
                </div>
            </div>

        );
    }
}
