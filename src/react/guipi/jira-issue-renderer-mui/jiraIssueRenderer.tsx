import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, OptionableFieldUI, SelectFieldUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import {
    Avatar,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Grid,
    InputAdornment,
    MenuItem,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { KeyboardDatePicker, KeyboardDateTimePicker } from '@material-ui/pickers';
import { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';
import React from 'react';
import { CheckboxValue, IssueRenderer } from '../../../lib/guipi/jira-issue-renderer/src/issueRenderer';

export class JiraIssueRenderer implements IssueRenderer<JSX.Element> {
    constructor() {}

    public renderTextInput(
        field: InputFieldUI,
        onChange: (field: FieldUI, value: string) => void,
        value?: string | undefined
    ): JSX.Element {
        return (
            <TextField
                type={this.normalizeType(field.valueType)}
                required={field.required}
                autoFocus
                autoComplete="off"
                margin="dense"
                id={field.key}
                key={field.key}
                name={field.key}
                label={field.name}
                fullWidth
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(field, e.target.value);
                }}
            />
        );
    }

    public renderTextAreaInput(
        field: InputFieldUI,
        onChange: (field: FieldUI, value: string) => void,
        value?: string | undefined
    ): JSX.Element {
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(field, e.target.value);
                }}
            />
        );
    }

    public renderIssueTypeSelector(
        field: FieldUI,
        options: IssueType[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: IssueType | undefined
    ): JSX.Element {
        return (
            <TextField
                id={field.key}
                key={field.key}
                name={field.key}
                label={field.name}
                select
                size="small"
                margin="dense"
                value={value?.id || ''}
                onChange={(event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
                    onSelect(field, options.find((option) => option.id === event.target.value) as any);
                }}
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

    // For the most part Jira uses valid HTML input types. The exception is `string` which needs to become `text`.
    private normalizeType(input: string): string {
        if (input === ValueType.String) {
            return 'text';
        }
        return input;
    }

    public renderSelectInput(
        field: SelectFieldUI,
        options: any[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: any
    ): JSX.Element {
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
                getOptionLabel={(option) => option.name ?? option.value ?? ''}
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
                            <Typography>{option.name ?? option.value ?? ''}</Typography>
                        </Grid>
                    </Grid>
                )}
                onChange={(event: React.ChangeEvent, newValue: any) => {
                    onSelect(field, newValue);
                }}
            />
        );
    }

    public renderAutoCompleteInput(
        field: SelectFieldUI,
        options: any[],
        onAutoComplete: (field: FieldUI, value: string) => void,
        onSelect: (field: FieldUI, value: string) => void,
        isWaiting = false,
        isCreatable = true,
        value?: any
    ): JSX.Element {
        return (
            <Autocomplete
                freeSolo={isCreatable}
                onChange={(value: any, newValue: any) => {
                    onSelect(field, newValue);
                }}
                filterOptions={(o, s) => o}
                filterSelectedOptions={true}
                value={value}
                id={field.key}
                options={options}
                getOptionLabel={(option) => option.name}
                renderOption={(option) => option.name}
                groupBy={(option) => {
                    return option.category ? option.category : '';
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        onChange={(event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
                            onAutoComplete(field, event.target.value);
                        }}
                        label={field.name}
                        margin="normal"
                        variant="outlined"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <React.Fragment>
                                    {isWaiting ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </React.Fragment>
                            ),
                        }}
                    />
                )}
            />
        );
    }

    public renderCheckbox(
        field: OptionableFieldUI,
        onChange: (field: FieldUI, value: CheckboxValue) => void,
        value?: CheckboxValue
    ): JSX.Element {
        return (
            <FormGroup>
                <FormLabel component="legend">{field.name}</FormLabel>
                {field.allowedValues.map((checkbox: any) => {
                    let checkboxState = false;
                    if (value) {
                        checkboxState = value[checkbox.id] ?? false;
                    }
                    return (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    id={`${field.key}${checkbox.id}`}
                                    checked={checkboxState}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
                                        const v = value ? { ...value } : {};
                                        v[checkbox.id] = checked;
                                        onChange(field, v);
                                    }}
                                />
                            }
                            label={checkbox.value}
                        />
                    );
                })}
            </FormGroup>
        );
    }

    public renderRadioSelect(
        field: OptionableFieldUI,
        onChange: (field: FieldUI, value: string) => void,
        value?: string
    ): JSX.Element {
        const options = [{ id: '0', value: 'None' }, ...field.allowedValues];

        return (
            <FormControl component="fieldset">
                <FormLabel component="legend" focused={false}>
                    {field.name}
                </FormLabel>
                <RadioGroup
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>, value: string) => {
                        onChange(field, value);
                    }}
                >
                    {options.map((radioOption: any) => {
                        return (
                            <FormControlLabel value={radioOption.id} control={<Radio />} label={radioOption.value} />
                        );
                    })}
                </RadioGroup>
            </FormControl>
        );
    }

    public renderDateField(
        field: FieldUI,
        onChange: (field: FieldUI, value?: Date) => void,
        value?: Date
    ): JSX.Element {
        return (
            <KeyboardDatePicker
                clearable
                disableToolbar
                format="MM/DD/yyyy"
                margin="normal"
                id={field.key}
                label={field.name}
                value={value ?? null}
                onChange={(date: MaterialUiPickersDate, value?: string) => {
                    onChange(field, date?.toDate());
                }}
            />
        );
    }

    public renderDateTimeField(
        field: FieldUI,
        onChange: (field: FieldUI, value?: Date) => void,
        value?: Date
    ): JSX.Element {
        return (
            <KeyboardDateTimePicker
                clearable
                format="MM/DD/yyyy h:mm A"
                minutesStep={5}
                id={field.key}
                label={field.name}
                value={value ?? null}
                onChange={(date: MaterialUiPickersDate, value?: string) => {
                    onChange(field, date?.toDate());
                }}
            />
        );
    }
}
