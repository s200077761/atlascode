import * as React from 'react';
import { Checkbox } from '@atlaskit/checkbox';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { Field, CheckboxField } from '@atlaskit/form';
import Select, { AsyncSelect, components } from '@atlaskit/select';
import { chain } from '../fieldValidators';
import { WorkingSite } from '../../../config/model';

type changeObject = { [key: string]: any };

const { Option } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', 'align-items': 'center' }}><img src={props.data.avatarUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', 'align-items': 'center' }}><img src={props.data.avatarUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue>

);

export default class JiraExplorer extends React.Component<{ configData: ConfigData, isLoading: boolean, loadProjectOptions: (input: string) => Promise<any>, onConfigChange: (changes: changeObject, removes?: string[]) => void }, ConfigData> {

    constructor(props: any) {
        super(props);

        this.state = emptyConfigData;
    }

    componentWillReceiveProps = (nextProps: any) => {

        if (nextProps.configData.config.jira.workingSite && !nextProps.configData.config.jira.workingSite.id) {
            nextProps.configData.config.jira.workingSite = '';
        }

        if (nextProps.configData.config.jira.workingProject && !nextProps.configData.config.jira.workingProject.id) {
            nextProps.configData.config.jira.workingProject = '';
        }
        this.setState(nextProps.configData);
    }

    onCheckboxChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes);
        }
    }

    handleSiteChange = (item: WorkingSite) => {
        if (item) {
            const changes = Object.create(null);
            const removes = [];

            removes.push('jira.workingProject');
            changes['jira.workingSite'] = item;

            if (this.props.onConfigChange) {
                this.props.onConfigChange(changes, removes);
            }
        }
    }

    handleProjectChange = (item: any) => {
        if (item) {
            const changes = Object.create(null);
            changes['jira.workingProject'] = { id: item.id, name: item.name, key: item.key };

            if (this.props.onConfigChange) {
                this.props.onConfigChange(changes);
            }
        } else {
            const removes = ['jira.workingProject'];
            if (this.props.onConfigChange) {
                this.props.onConfigChange([], removes);
            }
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

    render() {

        return (

            <div>
                <CheckboxField
                    name='issue-explorer-enabled'
                    id='issue-explorer-enabled'
                    value='jira.explorer.enabled'
                    defaultIsChecked={this.props.configData.config.jira.explorer.enabled}>
                    {
                        (fieldArgs: any) => {
                            return (
                                <Checkbox {...fieldArgs.fieldProps}
                                    label='Enable Jira Issue Explorer'
                                    isIndeterminate={this.getIsExplorerIndeterminate()}
                                    onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                />
                            );
                        }
                    }
                </CheckboxField>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingLeft: '24px',
                    }}
                >
                    <CheckboxField
                        name='explorer-openissues'
                        id='explorer-openissues'
                        value='jira.explorer.showOpenIssues'
                        defaultIsChecked={this.props.configData.config.jira.explorer.showOpenIssues}>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Show My Open Issues'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isDisabled={!this.props.configData.config.jira.explorer.enabled}
                                    />
                                );
                            }
                        }
                    </CheckboxField>
                    <CheckboxField
                        name='explorer-assigned-issues'
                        id='explorer-assigned-issues'
                        value='jira.explorer.showAssignedIssues'
                        defaultIsChecked={this.props.configData.config.jira.explorer.showAssignedIssues}>
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Checkbox {...fieldArgs.fieldProps}
                                        label='Show My Assigned Issues'
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.onCheckboxChange)}
                                        isDisabled={!this.props.configData.config.jira.explorer.enabled}
                                    />
                                );
                            }
                        }
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
                <div className="refreshInterval">
                    <span>Notify of new Jira issues: </span>
                    <input className='ac-inputField-inline' style={{ width: '60px' }} name="jira-issue-monitor-refresh-interval"
                        type="number" min="0"
                        value={this.props.configData.config.jira.issueMonitor.refreshInterval}
                        onChange={(e: any) => this.handleNumberChange(e, "jira.issueMonitor.refreshInterval")}
                        disabled={!this.props.configData.config.jira.explorer.enabled} />
                    <span> minutes (setting to 0 disables notification)</span>
                </div>
                <hr />

                <div className='ac-flex-space-between'>
                    <Field label='Default Site'
                        id='defaultSite'
                        name='defaultSite'
                        defaultValue={this.state.config.jira.workingSite}
                    >
                        {
                            (fieldArgs: any) => {
                                return (
                                    <Select
                                        {...fieldArgs.fieldProps}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        getOptionLabel={(option: any) => option.name}
                                        getOptionValue={(option: any) => option.id}
                                        options={this.state.sites}
                                        components={{ Option: IconOption, SingleValue: IconValue }}
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.handleSiteChange)}
                                    />
                                );
                            }
                        }
                    </Field>
                    <div className='ac-hmargin' />
                    <Field defaultValue={this.state.config.jira.workingProject}
                        label='Project'
                        id='project'
                        name='project'
                    >
                        {
                            (fieldArgs: any) => {
                                return (
                                    <AsyncSelect
                                        {...fieldArgs.fieldProps}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        getOptionLabel={(option: any) => {
                                            return option.name;
                                        }}
                                        getOptionValue={(option: any) => {
                                            return option.key;
                                        }}
                                        onChange={chain(fieldArgs.fieldProps.onChange, this.handleProjectChange)}
                                        defaultOptions={this.state.projects}
                                        loadOptions={this.props.loadProjectOptions}
                                        placeholder="Choose a Project"
                                        isLoading={this.props.isLoading}
                                    />
                                );
                            }
                        }
                    </Field>
                </div>

            </div>

        );
    }
}
