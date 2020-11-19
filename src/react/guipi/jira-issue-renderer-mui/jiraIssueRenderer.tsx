import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, SelectFieldUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { Avatar, Grid, InputAdornment, MenuItem, TextField, Typography } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import React from 'react';
import { IssueRenderer } from '../../../lib/guipi/jira-issue-renderer/src/issueRenderer';
import {
    CreateJiraIssueUIAction,
    CreateJiraIssueUIActionType,
} from '../../atlascode/issue/createJiraIssuePageController';

export class JiraIssueRenderer implements IssueRenderer<JSX.Element> {
    private _dispatch: React.Dispatch<CreateJiraIssueUIAction>;

    constructor(dispatch: React.Dispatch<CreateJiraIssueUIAction>) {
        this._dispatch = dispatch;
    }

    public renderTextInput(field: InputFieldUI, value?: string | undefined): JSX.Element {
        return (
            <TextField
                required={field.required}
                autoFocus
                autoComplete="off"
                margin="dense"
                id={field.key}
                key={field.key}
                name={field.key}
                label={field.name}
                fullWidth
                // inputRef={register({
                //     required: 'Base URL is required',
                //     validate: (value: string) => validateUrl('Base URL', value),
                // })}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    this._dispatch({
                        type: CreateJiraIssueUIActionType.FieldUpdate,
                        fieldUI: field,
                        value: e.target.value,
                    });
                }}
            />
        );
    }

    public renderTextAreaInput(field: InputFieldUI, value?: string | undefined): JSX.Element {
        return (
            <TextField
                required={field.required}
                autoFocus
                autoComplete="off"
                margin="dense"
                id={field.key}
                key={field.key}
                name={field.key}
                label={field.name}
                fullWidth
                multiline
                rows={5}
                // inputRef={register({
                //     required: 'Base URL is required',
                //     validate: (value: string) => validateUrl('Base URL', value),
                // })}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    this._dispatch({
                        type: CreateJiraIssueUIActionType.FieldUpdate,
                        fieldUI: field,
                        value: e.target.value,
                    });
                }}
            />
        );
    }

    public renderIssueTypeSelector(field: FieldUI, options: IssueType[], value?: IssueType | undefined): JSX.Element {
        return (
            <TextField
                select
                size="small"
                margin="dense"
                value={value?.id || ''}
                onChange={(event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
                    this._dispatch({
                        type: CreateJiraIssueUIActionType.FieldUpdate,
                        fieldUI: field,
                        value: options.find((option) => option.id === event.target.value),
                    });
                }}
                id={field.key}
                key={field.key}
                name={field.key}
                label={field.name}
            >
                {options.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                        <Grid container spacing={1} direction="row" alignItems="center">
                            <Grid item>
                                <Avatar style={{ height: '1em', width: '1em' }} variant="square" src={option.iconUrl} />
                            </Grid>
                            <Grid item>
                                <Typography>{option.name}</Typography>
                            </Grid>
                        </Grid>
                    </MenuItem>
                ))}
            </TextField>
        );
    }

    public renderSelectInput(field: SelectFieldUI, options: any[], value?: any): JSX.Element {
        // TODO Split each valueType to its own renderValueType method
        if (field.valueType === ValueType.Version) {
            options = options.flatMap((val) => val.options.map((opt: any) => ({ ...opt, groupLabel: val.label })));
        }
        return (
            <Autocomplete
                fullWidth
                id={field.key}
                key={field.key}
                multiple={field.isMulti}
                options={options || []}
                getOptionLabel={(option) => option.name}
                getOptionSelected={(option, value) => option.id === value.id}
                groupBy={(option) => option.groupLabel}
                value={value || (field.isMulti ? [] : null)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={field.name}
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: value?.iconUrl ? (
                                <InputAdornment position="start">
                                    <Avatar
                                        style={{ height: '1em', width: '1em' }}
                                        variant="square"
                                        src={value?.iconUrl}
                                    />
                                </InputAdornment>
                            ) : (
                                params.InputProps.startAdornment
                            ),
                        }}
                    />
                )}
                renderOption={(option) => (
                    <Grid container spacing={1} direction="row" alignItems="center" key={option.id}>
                        <Grid item hidden={!!!option.iconUrl}>
                            <Avatar style={{ height: '1em', width: '1em' }} variant="square" src={option.iconUrl} />
                        </Grid>
                        <Grid item>
                            <Typography>{option.name}</Typography>
                        </Grid>
                    </Grid>
                )}
                onChange={(event: React.ChangeEvent, newValue: any) => {
                    this._dispatch({
                        type: CreateJiraIssueUIActionType.FieldUpdate,
                        fieldUI: field,
                        value: newValue,
                    });
                }}
            />
        );
    }
}
