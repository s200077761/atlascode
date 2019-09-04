import React from 'react';
import TableTree from '@atlaskit/table-tree';
import { Attachment } from '../../../jira/jira-client/model/entities';

type ItemData = { attachment: Attachment };

interface AttachmentListProps {
    attachments: Attachment[];
}

const Filename = (data: ItemData) => <p style={{ display: "inline" }}>{data.attachment.filename}</p>;
const Size = (data: ItemData) => <p style={{ display: "inline" }}>{data.attachment.size}</p>;

export const AttachmentList: React.FunctionComponent<AttachmentListProps> = ({ attachments }) => {

    return (
        <TableTree
            columns={[Filename, Size]}
            columnWidths={['100%', '150px']}
            items={attachments.map(attachment => {
                return {
                    id: attachment.id,
                    content: {
                        attachment: attachment,
                    }
                };
            })}
        />
    );

};