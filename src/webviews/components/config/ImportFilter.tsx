import Button from '@atlaskit/button';
import { Field } from '@atlaskit/form';
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import Select, { AsyncSelect, components } from '@atlaskit/select';
import { Filter } from '@atlassianlabs/jira-pi-common-models/entities';
import debounce from "lodash.debounce";
import React, { PureComponent } from "react";
import { v4 } from "uuid";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";
import { JQLEntry } from "../../../config/model";
import * as FieldValidators from "../fieldValidators";

const DebounceInterval = 250;

const IconOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue>
);

export default class ImportFilter extends PureComponent<{
    sites: DetailedSiteInfo[];
    filters: { [k: string]: Filter[] };
    filterSearches: { [k: string]: Filter[] };
    jiraFilterFetcher: (site: DetailedSiteInfo) => void;
    jiraFilterSearcher: (site: DetailedSiteInfo, query: string) => Promise<Filter[]>;
    onSave: (entry: JQLEntry) => void;
    onCancel: () => void;
}, {
    selectedSite: DetailedSiteInfo | undefined;
    selectedFilter: Filter | undefined;
}> {
    constructor(props: any) {
        super(props);

        this.state = {
            selectedSite: undefined,
            selectedFilter: undefined
        };
    }

    onOpenComplete = () => { };

    onSave = () => {
        const entry: JQLEntry = {
            id: v4(),
            siteId: this.state.selectedSite!.id,
            name: this.state.selectedFilter!.name,
            query: this.state.selectedFilter!.jql,
            enabled: true,
            monitor: true,
            filterId: this.state.selectedFilter!.id
        };
        this.props.onSave(entry);
    };

    handleSiteChange = (selected: any) => {
        this.setState({ selectedSite: selected });
        this.props.jiraFilterFetcher(selected);
    };

    handleFilterChange = (selected: any) => {
        this.setState({ selectedFilter: selected });
    };

    sites = () => {
        if (Array.isArray(this.props.sites)) {
            return this.props.sites;
        }
        return [];
    };

    filters = () => {
        if (this.props.filters && this.state.selectedSite) {
            return this.props.filters[this.state.selectedSite.id];
        }
        return [];
    };

    loadFilters = (input: string, callback: (filters: { label: string, options: Filter[] }[]) => void) => {
        if (this.state.selectedSite) {
            if (!input) {
                callback([{ label: "Favorites", options: this.props.filters[this.state.selectedSite.id] }]);
                return;
            }

            this.props.jiraFilterSearcher(this.state.selectedSite, input).then(filters => {
                const fav = filters.filter(f => f.favorite);
                const norm = filters.filter(f => !f.favorite);
                callback([{ label: "Favorites", options: fav }, { label: "Filters", options: norm }]);
            });
        }
    };

    // loadFiltersDebounced = debounce(this.loadFilters, DebounceInterval);

    defaultFilters = () => {
        if (this.state.selectedSite &&
            this.props.filters &&
            this.props.filters[this.state.selectedSite.id]) {
            const filters = this.props.filters[this.state.selectedSite.id];
            return [{ label: "Favorites", options: filters }];
        }
        return [];
    };

    render() {
        return (
            <ModalTransition>
                <Modal
                    onClose={this.props.onCancel}
                    heading="Jira Filters"
                    onOpenComplete={this.onOpenComplete}
                    shouldCloseOnEscapePress={false}
                >
                    <Field label='Select Site'
                        id='select-site'
                        name='select-site'
                        defaultValue=""
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
                                        options={this.props.sites}
                                        components={{ Option: IconOption, SingleValue: IconValue }}
                                        onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.handleSiteChange)}
                                        styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
                                        menuPortalTarget={document.body}
                                    />
                                );
                            }
                        }
                    </Field>
                    <Field label='Select Filter'
                        id='select-filter'
                        name='select-filter'
                        defaultValue=""
                    >
                        {
                            (fieldArgs: any) => {
                                return (
                                    <AsyncSelect
                                        {...fieldArgs.fieldProps}
                                        name="filter"
                                        id="filter"
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        defaultOptions={this.defaultFilters()}
                                        options={this.filters()}
                                        formatOptionLabel={(option: any) => option.name}
                                        formatGroupLabel={(l: any) => l.label}
                                        value={this.state.selectedFilter}
                                        onChange={this.handleFilterChange}
                                        loadOptions={debounce(this.loadFilters, DebounceInterval)}
                                        styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
                                        menuPortalTarget={document.body}
                                        isSearchable={this.state.selectedSite && this.state.selectedSite.isCloud}
                                    />
                                );
                            }
                        }
                    </Field>
                    <div style={{
                        marginTop: '24px',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}>
                        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px' }}>
                            <Button
                                className='ac-button'
                                isDisabled={!this.state.selectedFilter}
                                onClick={this.onSave}
                            >
                                Save
                            </Button>
                        </div>
                        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px' }}>
                            <Button
                                className='ac-button'
                                onClick={this.props.onCancel}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>

                </Modal>
            </ModalTransition>
        );
    }
}
