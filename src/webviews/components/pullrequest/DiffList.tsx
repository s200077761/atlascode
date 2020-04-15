import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import React from 'react';
import { FileDiff, FileStatus } from 'src/bitbucket/model';

export default class DiffList extends React.Component<
    { fileDiffs: FileDiff[]; openDiffHandler: (filediff: FileDiff) => void; fileDiffsLoading: boolean },
    {}
> {
    mapFileStatusToColorScheme = (status: FileStatus) => {
        if (status === FileStatus.ADDED) {
            return { backgroundColor: '#fff', borderColor: '#60b070', color: '#14892c' };
        } else if (status === FileStatus.MODIFIED) {
            return { backgroundColor: '#fff', borderColor: '#a5b3c2', color: '#4a6785' };
        } else if (status === FileStatus.DELETED) {
            return { backgroundColor: '#fff', borderColor: '#e8a29b', color: '#d04437' };
        } else if (status === FileStatus.RENAMED) {
            return { backgroundColor: '#fff', borderColor: '#c0ad9d', color: '#815b3a' };
        } else if (status === FileStatus.COPIED) {
            return { backgroundColor: '#fff', borderColor: '#f2ae00', color: '#f29900' };
        } else if (status === FileStatus.CONFLICT) {
            return { backgroundColor: '#f6c342', borderColor: '#f6c342', color: '#594300' };
        } else {
            //I'm not sure how Bitbucket handles 'unknown' statuses so I settled on purple
            return { backgroundColor: '#fff', borderCOlor: '#881be0', color: '#7a44a6' };
        }
    };

    mapFileStatusToWord = (status: FileStatus) => {
        if (status === FileStatus.ADDED) {
            return 'ADDED';
        } else if (status === FileStatus.MODIFIED) {
            return 'MODIFIED';
        } else if (status === FileStatus.DELETED) {
            return 'DELETED';
        } else if (status === FileStatus.RENAMED) {
            return 'RENAMED';
        } else if (status === FileStatus.COPIED) {
            return 'COPIED';
        } else if (status === FileStatus.CONFLICT) {
            return 'CONFLICT';
        } else {
            return 'UNKNOWN';
        }
    };

    generateDiffList = () => {
        return this.props.fileDiffs.map((fileDiff) => (
            <li className="iterable-item file-summary file-modified">
                <div className="commit-file-diff-stats">
                    {fileDiff.linesAdded !== -1 && (
                        <React.Fragment>
                            <span className="lines-added">+{fileDiff.linesAdded}</span>
                            <span className="lines-removed">-{fileDiff.linesRemoved}</span>
                        </React.Fragment>
                    )}
                    <Tooltip
                        content={`${this.mapFileStatusToWord(fileDiff.status)} ${
                            fileDiff.similarity ? `(${fileDiff.similarity}% similar)` : ''
                        }`}
                        position="mouse"
                    >
                        <span className="aui-lozenge" style={this.mapFileStatusToColorScheme(fileDiff.status)}>
                            {fileDiff.status.substring(0, 1)}
                        </span>
                    </Tooltip>
                    <a
                        className="commit-files-summary--filename"
                        style={{ cursor: 'pointer' }}
                        onClick={() => this.props.openDiffHandler(fileDiff)}
                    >
                        {fileDiff.file}
                    </a>
                </div>
            </li>
        ));
    };

    render() {
        return (
            <React.Fragment>
                {this.props.fileDiffsLoading && (
                    <Tooltip content="waiting for data...">
                        <Spinner delay={100} size="large" />
                    </Tooltip>
                )}
                {!this.props.fileDiffsLoading && (
                    <ul className="commit-files-summary" id="commit-files-summary">
                        {this.generateDiffList()}
                    </ul>
                )}
                {!this.props.fileDiffsLoading && this.props.fileDiffs.length === 0 && (
                    <p>There are no changes to display.</p>
                )}
            </React.Fragment>
        );
    }
}
