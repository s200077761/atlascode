import { Tooltip } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { ToggleButton } from '@material-ui/lab';
import React, { useCallback, useState } from 'react';
import { BitbucketSite, User } from '../../../bitbucket/model';
import DialogUserPicker from './DialogUserPicker';

type AddReviewersProps = {
    site: BitbucketSite;
    reviewers: User[];
    updateReviewers: (user: User[]) => Promise<void>;
};
export const AddReviewers: React.FunctionComponent<AddReviewersProps> = ({ site, reviewers, updateReviewers }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleUpdateReviewers = useCallback(
        async (newReviewers: User[]) => {
            setIsOpen(false);
            await updateReviewers(newReviewers);
        },
        [updateReviewers]
    );

    const handleToggleOpen = useCallback(() => {
        setIsOpen(true);
    }, [setIsOpen]);

    const handleToggleClosed = useCallback(() => {
        setIsOpen(false);
    }, [setIsOpen]);

    return (
        <React.Fragment>
            <Tooltip title="Add Reviewers">
                <ToggleButton
                    onClick={handleToggleOpen}
                    selected={isOpen}
                    value={'Add Reviewers'}
                    style={{ borderStyle: 'none' }}
                >
                    <AddIcon />
                </ToggleButton>
            </Tooltip>
            <DialogUserPicker
                site={site}
                users={reviewers}
                defaultUsers={[]}
                onChange={handleUpdateReviewers}
                hidden={isOpen}
                onClose={handleToggleClosed}
            />
        </React.Fragment>
    );
};
