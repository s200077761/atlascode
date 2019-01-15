import styled from 'styled-components';

export const MarginAuto = styled.div`
margin: auto;
`;

export const Spacer = styled.div`
margin-left: 10px;
margin-right: 10px;
`;

export const VerticalPadding = styled.div`
padding-top: 10px;
padding-bottom: 10px;
`;

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
width: 100%;
`;

export const BlockCentered = styled.div`
display: block;
text-align: center;
margin: 20px;
`;

export const TextFieldStyles = {
    backgroundColor: 'var(--vscode-input-background)',
    backgroundColorFocus: 'var(--vscode-input-focus)',
    backgroundColorHover: 'var(--vscode-input-background--darken-10)',
    // borderColor: 'var(--vscode-input-border)',
    borderColorFocus: 'var(--vscode-inputOption-activeBorder)'
};

export const TextAreaStyles = {
    backgroundColor: 'var(--vscode-input-background)',
    backgroundColorFocus: 'var(--vscode-input-focus)',
    backgroundColorHover: 'var(--vscode-input-background--darken-10)',
    // borderColor: 'var(--vscode-input-border)',
    borderColorFocus: 'var(--vscode-inputOption-activeBorder)'
};
