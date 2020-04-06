import { CircularProgress, Grid, MenuItem, Select, Theme } from '@material-ui/core';
import { useTheme } from '@material-ui/styles';
import React, { useState } from 'react';
import Lozenge from '../common/Lozenge';

type StatusMenuProps = {
    status: string;
    onChange: (value: string) => Promise<void>;
};

const StatusRenderer = {
    new: <Lozenge appearance="new" label="new" />,
    open: <Lozenge appearance="inprogress" label="open" />,
    resolved: <Lozenge appearance="success" label="resolved" />,
    'on hold': <Lozenge appearance="default" label="on hold" />,
    invalid: <Lozenge appearance="moved" label="invalid" />,
    duplicate: <Lozenge appearance="default" label="duplicate" />,
    wontfix: <Lozenge appearance="removed" label="wontfix" />,
    closed: <Lozenge appearance="default" label="closed" />
};

const StatusMenu: React.FC<StatusMenuProps> = (props: StatusMenuProps) => {
    const handleChange = async (
        event: React.ChangeEvent<{
            name?: string | undefined;
            value: string;
        }>
    ) => {
        setLoading(true);
        if (event?.target?.value) {
            await props.onChange(event.target.value);
        }
        setLoading(false);
    };

    const theme = useTheme<Theme>();
    const [loading, setLoading] = useState(false);

    return (
        <Select
            value={props.status}
            onChange={handleChange}
            renderValue={(value: string) => {
                return (
                    <Grid container spacing={1} alignItems="center">
                        <Grid item>{StatusRenderer[value]}</Grid>
                        <Grid item hidden={loading}>
                            <CircularProgress size={theme.typography.fontSize} />
                        </Grid>
                    </Grid>
                );
            }}
        >
            {Object.keys(StatusRenderer).map(status => (
                <MenuItem key={status} value={status}>
                    {StatusRenderer[status]}
                </MenuItem>
            ))}
        </Select>
    );
};

export default StatusMenu;
