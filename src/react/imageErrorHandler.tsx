export const attachImageErrorHandler = (baseUri: string) => {
    window.addEventListener(
        'error',
        (ee: ErrorEvent) => {
            const targetEL = ee.target as HTMLElement;
            if (ee && targetEL && targetEL.nodeName === 'IMG') {
                const origianlSrc = targetEL.getAttribute('src');
                targetEL.setAttribute('src', `${baseUri}images/no-image.svg`);
                targetEL.setAttribute('alt', `Unable to load image: ${origianlSrc}`);
                targetEL.setAttribute('title', `Unable to load image: ${origianlSrc}`);
                targetEL.setAttribute('class', 'ac-broken-img');
                targetEL.setAttribute('width', '24');
                targetEL.setAttribute('height', '24');
            }
        },
        { capture: true }
    );
};
