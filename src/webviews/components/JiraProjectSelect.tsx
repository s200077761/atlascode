import React from 'react';
import { AsyncSelect } from '@atlaskit/select';
import { WorkingProject } from '../../config/model';


export default class JiraProjectSelect extends React.Component<{ initialOptions: WorkingProject[], onQuery:(input:string) => Promise<any> }, {}> {
    constructor(props: any) {
        super(props);
    }

    optionLabel = (option:WorkingProject) => {
        return option.name;
    }

    optionValue = (option:WorkingProject) => {
        return option.key;
    }

    // async load function using callback (promises also supported)
    loadOptions = (inputValue:string) => {
        return this.props.onQuery(inputValue);
    }

    render() {
        return (
            <AsyncSelect
                className="ak-select-container"
                classNamePrefix="ak-select"
                getOptionLabel={this.optionLabel}
                getOptionValue={this.optionValue}
                defaultOptions={this.props.initialOptions}
                loadOptions={this.loadOptions}
                placeholder="Choose a Project"
                closeMenuOnSelect={false}
                menuIsOpen={true}
            />
        );
    }
}

