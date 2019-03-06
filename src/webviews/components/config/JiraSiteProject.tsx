import * as React from 'react';
import { Field } from '@atlaskit/form';
import Select, { AsyncSelect, components } from '@atlaskit/select';
import { WorkingSite } from '../../../config/model';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { chain } from '../fieldValidators';

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

type changeObject = { [key: string]: any };

export default class JiraSiteProject extends React.Component<{ configData: ConfigData, isLoading: boolean, loadProjectOptions: (input: string) => Promise<any>, onConfigChange: (changes: changeObject, removes?: string[]) => void }, ConfigData> {
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
    
    render() {
        return <div className='ac-flex-space-between'>
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
                                return `${option.name} (${option.key})`;
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
    </div>;
    }
}