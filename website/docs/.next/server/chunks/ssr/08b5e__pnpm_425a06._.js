module.exports = {

"[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/mdx-components/image.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "Image": (()=>Image)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
;
;
const Image = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"])((props, ref)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(6);
    if (("TURBOPACK compile-time value", "development") !== "production" && typeof props.src === "object" && !("blurDataURL" in props.src)) {
        console.warn(`[nextra] Failed to load blur image "${props.src.src}" due missing "src.blurDataURL" value.
This is Turbopack bug, which will not occurs on production (since Webpack is used for "next build" command).`);
        let t02;
        if ($[0] !== props) {
            t02 = {
                ...props,
                placeholder: "empty"
            };
            $[0] = props;
            $[1] = t02;
        } else {
            t02 = $[1];
        }
        props = t02;
    }
    const ComponentToUse = typeof props.src === "object" ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"] : "img";
    let t0;
    if ($[2] !== ComponentToUse || $[3] !== props || $[4] !== ref) {
        t0 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(ComponentToUse, {
            ...props,
            ref,
            "data-pagefind-index-attrs": "title,alt"
        });
        $[2] = ComponentToUse;
        $[3] = props;
        $[4] = ref;
        $[5] = t0;
    } else {
        t0 = $[5];
    }
    return t0;
});
Image.displayName = "Image";
;
}}),
"[project]/node_modules/.pnpm/react-medium-image-zoom@5.2.13_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-medium-image-zoom/dist/index.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "Controlled": (()=>Controlled),
    "default": (()=>Uncontrolled)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
'use client';
;
;
function ICompress() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
        "aria-hidden": "true",
        "data-rmiz-btn-unzoom-icon": true,
        fill: "currentColor",
        focusable: "false",
        viewBox: "0 0 16 16",
        xmlns: "http://www.w3.org/2000/svg"
    }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("path", {
        d: "M 14.144531 1.148438 L 9 6.292969 L 9 3 L 8 3 L 8 8 L 13 8 L 13 7 L 9.707031 7 L 14.855469 1.851563 Z M 8 8 L 3 8 L 3 9 L 6.292969 9 L 1.148438 14.144531 L 1.851563 14.855469 L 7 9.707031 L 7 13 L 8 13 Z"
    }));
}
function IEnlarge() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
        "aria-hidden": "true",
        "data-rmiz-btn-zoom-icon": true,
        fill: "currentColor",
        focusable: "false",
        viewBox: "0 0 16 16",
        xmlns: "http://www.w3.org/2000/svg"
    }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("path", {
        d: "M 9 1 L 9 2 L 12.292969 2 L 2 12.292969 L 2 9 L 1 9 L 1 14 L 6 14 L 6 13 L 2.707031 13 L 13 2.707031 L 13 6 L 14 6 L 14 1 Z"
    }));
}
const testElType = (type, el)=>type === el?.tagName?.toUpperCase?.();
const testDiv = (el)=>testElType('DIV', el) || testElType('SPAN', el);
const testImg = (el)=>testElType('IMG', el);
const testImgLoaded = (el)=>el.complete && el.naturalHeight !== 0;
const testSvg = (el)=>testElType('SVG', el);
const getScaleToWindow = ({ height, offset, width })=>{
    return Math.min((window.innerWidth - offset * 2) / width, (window.innerHeight - offset * 2) / height);
};
const getScaleToWindowMax = ({ containerHeight, containerWidth, offset, targetHeight, targetWidth })=>{
    const scale = getScaleToWindow({
        height: targetHeight,
        offset,
        width: targetWidth
    });
    const ratio = targetWidth > targetHeight ? targetWidth / containerWidth : targetHeight / containerHeight;
    return scale > 1 ? ratio : scale * ratio;
};
const getScale = ({ containerHeight, containerWidth, hasScalableSrc, offset, targetHeight, targetWidth })=>{
    if (!containerHeight || !containerWidth) {
        return 1;
    }
    return !hasScalableSrc && targetHeight && targetWidth ? getScaleToWindowMax({
        containerHeight,
        containerWidth,
        offset,
        targetHeight,
        targetWidth
    }) : getScaleToWindow({
        height: containerHeight,
        offset,
        width: containerWidth
    });
};
const URL_REGEX = /url(?:\(['"]?)(.*?)(?:['"]?\))/;
const getImgSrc = (imgEl)=>{
    if (imgEl) {
        if (testImg(imgEl)) {
            return imgEl.currentSrc;
        } else if (testDiv(imgEl)) {
            const bgImg = window.getComputedStyle(imgEl).backgroundImage;
            if (bgImg) {
                return URL_REGEX.exec(bgImg)?.[1];
            }
        }
    }
};
const getImgAlt = (imgEl)=>{
    if (imgEl) {
        if (testImg(imgEl)) {
            return imgEl.alt ?? undefined;
        } else {
            return imgEl.getAttribute('aria-label') ?? undefined;
        }
    }
};
const getImgRegularStyle = ({ containerHeight, containerLeft, containerTop, containerWidth, hasScalableSrc, offset, targetHeight, targetWidth })=>{
    const scale = getScale({
        containerHeight,
        containerWidth,
        hasScalableSrc,
        offset,
        targetHeight,
        targetWidth
    });
    return {
        top: containerTop,
        left: containerLeft,
        width: containerWidth * scale,
        height: containerHeight * scale,
        transform: `translate(0,0) scale(${1 / scale})`
    };
};
const parsePosition = ({ position, relativeNum })=>{
    const positionNum = parseFloat(position);
    return position.endsWith('%') ? relativeNum * positionNum / 100 : positionNum;
};
const getImgObjectFitStyle = ({ containerHeight, containerLeft, containerTop, containerWidth, hasScalableSrc, objectFit, objectPosition, offset, targetHeight, targetWidth })=>{
    if (objectFit === 'scale-down') {
        if (targetWidth <= containerWidth && targetHeight <= containerHeight) {
            objectFit = 'none';
        } else {
            objectFit = 'contain';
        }
    }
    if (objectFit === 'cover' || objectFit === 'contain') {
        const widthRatio = containerWidth / targetWidth;
        const heightRatio = containerHeight / targetHeight;
        const ratio = objectFit === 'cover' ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);
        const [posLeft = '50%', posTop = '50%'] = objectPosition.split(' ');
        const posX = parsePosition({
            position: posLeft,
            relativeNum: containerWidth - targetWidth * ratio
        });
        const posY = parsePosition({
            position: posTop,
            relativeNum: containerHeight - targetHeight * ratio
        });
        const scale = getScale({
            containerHeight: targetHeight * ratio,
            containerWidth: targetWidth * ratio,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            top: containerTop + posY,
            left: containerLeft + posX,
            width: targetWidth * ratio * scale,
            height: targetHeight * ratio * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    } else if (objectFit === 'none') {
        const [posLeft = '50%', posTop = '50%'] = objectPosition.split(' ');
        const posX = parsePosition({
            position: posLeft,
            relativeNum: containerWidth - targetWidth
        });
        const posY = parsePosition({
            position: posTop,
            relativeNum: containerHeight - targetHeight
        });
        const scale = getScale({
            containerHeight: targetHeight,
            containerWidth: targetWidth,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            top: containerTop + posY,
            left: containerLeft + posX,
            width: targetWidth * scale,
            height: targetHeight * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    } else if (objectFit === 'fill') {
        const widthRatio = containerWidth / targetWidth;
        const heightRatio = containerHeight / targetHeight;
        const ratio = Math.max(widthRatio, heightRatio);
        const scale = getScale({
            containerHeight: targetHeight * ratio,
            containerWidth: targetWidth * ratio,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            width: containerWidth * scale,
            height: containerHeight * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    } else {
        return {};
    }
};
const getDivImgStyle = ({ backgroundPosition, backgroundSize, containerHeight, containerLeft, containerTop, containerWidth, hasScalableSrc, offset, targetHeight, targetWidth })=>{
    if (backgroundSize === 'cover' || backgroundSize === 'contain') {
        const widthRatio = containerWidth / targetWidth;
        const heightRatio = containerHeight / targetHeight;
        const ratio = backgroundSize === 'cover' ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);
        const [posLeft = '50%', posTop = '50%'] = backgroundPosition.split(' ');
        const posX = parsePosition({
            position: posLeft,
            relativeNum: containerWidth - targetWidth * ratio
        });
        const posY = parsePosition({
            position: posTop,
            relativeNum: containerHeight - targetHeight * ratio
        });
        const scale = getScale({
            containerHeight: targetHeight * ratio,
            containerWidth: targetWidth * ratio,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            top: containerTop + posY,
            left: containerLeft + posX,
            width: targetWidth * ratio * scale,
            height: targetHeight * ratio * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    } else if (backgroundSize === 'auto') {
        const [posLeft = '50%', posTop = '50%'] = backgroundPosition.split(' ');
        const posX = parsePosition({
            position: posLeft,
            relativeNum: containerWidth - targetWidth
        });
        const posY = parsePosition({
            position: posTop,
            relativeNum: containerHeight - targetHeight
        });
        const scale = getScale({
            containerHeight: targetHeight,
            containerWidth: targetWidth,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            top: containerTop + posY,
            left: containerLeft + posX,
            width: targetWidth * scale,
            height: targetHeight * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    } else {
        const [sizeW = '50%', sizeH = '50%'] = backgroundSize.split(' ');
        const sizeWidth = parsePosition({
            position: sizeW,
            relativeNum: containerWidth
        });
        const sizeHeight = parsePosition({
            position: sizeH,
            relativeNum: containerHeight
        });
        const widthRatio = sizeWidth / targetWidth;
        const heightRatio = sizeHeight / targetHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        const [posLeft = '50%', posTop = '50%'] = backgroundPosition.split(' ');
        const posX = parsePosition({
            position: posLeft,
            relativeNum: containerWidth - targetWidth * ratio
        });
        const posY = parsePosition({
            position: posTop,
            relativeNum: containerHeight - targetHeight * ratio
        });
        const scale = getScale({
            containerHeight: targetHeight * ratio,
            containerWidth: targetWidth * ratio,
            hasScalableSrc,
            offset,
            targetHeight,
            targetWidth
        });
        return {
            top: containerTop + posY,
            left: containerLeft + posX,
            width: targetWidth * ratio * scale,
            height: targetHeight * ratio * scale,
            transform: `translate(0,0) scale(${1 / scale})`
        };
    }
};
const SRC_SVG_REGEX = /\.svg$/i;
const getStyleModalImg = ({ hasZoomImg, imgSrc, isSvg, isZoomed, loadedImgEl, offset, shouldRefresh, targetEl })=>{
    const hasScalableSrc = isSvg || imgSrc?.slice?.(0, 18) === 'data:image/svg+xml' || hasZoomImg || !!(imgSrc && SRC_SVG_REGEX.test(imgSrc));
    const imgRect = targetEl.getBoundingClientRect();
    const targetElComputedStyle = window.getComputedStyle(targetEl);
    const isDivImg = loadedImgEl != null && testDiv(targetEl);
    const isImgObjectFit = loadedImgEl != null && !isDivImg;
    const styleImgRegular = getImgRegularStyle({
        containerHeight: imgRect.height,
        containerLeft: imgRect.left,
        containerTop: imgRect.top,
        containerWidth: imgRect.width,
        hasScalableSrc,
        offset,
        targetHeight: loadedImgEl?.naturalHeight || imgRect.height,
        targetWidth: loadedImgEl?.naturalWidth || imgRect.width
    });
    const styleImgObjectFit = isImgObjectFit ? getImgObjectFitStyle({
        containerHeight: imgRect.height,
        containerLeft: imgRect.left,
        containerTop: imgRect.top,
        containerWidth: imgRect.width,
        hasScalableSrc,
        objectFit: targetElComputedStyle.objectFit,
        objectPosition: targetElComputedStyle.objectPosition,
        offset,
        targetHeight: loadedImgEl?.naturalHeight || imgRect.height,
        targetWidth: loadedImgEl?.naturalWidth || imgRect.width
    }) : undefined;
    const styleDivImg = isDivImg ? getDivImgStyle({
        backgroundPosition: targetElComputedStyle.backgroundPosition,
        backgroundSize: targetElComputedStyle.backgroundSize,
        containerHeight: imgRect.height,
        containerLeft: imgRect.left,
        containerTop: imgRect.top,
        containerWidth: imgRect.width,
        hasScalableSrc,
        offset,
        targetHeight: loadedImgEl?.naturalHeight || imgRect.height,
        targetWidth: loadedImgEl?.naturalWidth || imgRect.width
    }) : undefined;
    const style = Object.assign({}, styleImgRegular, styleImgObjectFit, styleDivImg);
    if (isZoomed) {
        const viewportX = window.innerWidth / 2;
        const viewportY = window.innerHeight / 2;
        const childCenterX = parseFloat(String(style.left || 0)) + parseFloat(String(style.width || 0)) / 2;
        const childCenterY = parseFloat(String(style.top || 0)) + parseFloat(String(style.height || 0)) / 2;
        const translateX = viewportX - childCenterX;
        const translateY = viewportY - childCenterY;
        if (shouldRefresh) {
            style.transitionDuration = '0.01ms';
        }
        style.transform = `translate(${translateX}px,${translateY}px) scale(1)`;
    }
    return style;
};
const getStyleGhost = (imgEl)=>{
    if (!imgEl) {
        return {};
    }
    if (testSvg(imgEl)) {
        const parentEl = imgEl.parentElement;
        const rect = imgEl.getBoundingClientRect();
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            return {
                height: rect.height,
                left: parentRect.left - rect.left,
                top: parentRect.top - rect.top,
                width: rect.width
            };
        } else {
            return {
                height: rect.height,
                left: rect.left,
                width: rect.width,
                top: rect.top
            };
        }
    } else {
        return {
            height: imgEl.offsetHeight,
            left: imgEl.offsetLeft,
            width: imgEl.offsetWidth,
            top: imgEl.offsetTop
        };
    }
};
const adjustSvgIDs = (svgEl)=>{
    const newIdSuffix = '-zoom';
    const attrs = [
        'clip-path',
        'fill',
        'mask',
        'marker-start',
        'marker-mid',
        'marker-end'
    ];
    const idMap = new Map();
    if (svgEl.hasAttribute('id')) {
        const oldId = svgEl.id;
        const newId = oldId + newIdSuffix;
        idMap.set(oldId, newId);
        svgEl.id = newId;
    }
    svgEl.querySelectorAll('[id]').forEach((el)=>{
        const oldId = el.id;
        const newId = oldId + newIdSuffix;
        idMap.set(oldId, newId);
        el.id = newId;
    });
    idMap.forEach((newId, oldId)=>{
        const urlOldID = `url(#${oldId})`;
        const urlNewID = `url(#${newId})`;
        const attrsQuery = attrs.map((attr)=>`[${attr}="${urlOldID}"]`).join(', ');
        svgEl.querySelectorAll(attrsQuery).forEach((usedEl)=>{
            attrs.forEach((attr)=>{
                if (usedEl.getAttribute(attr) === urlOldID) {
                    usedEl.setAttribute(attr, urlNewID);
                }
            });
        });
    });
    svgEl.querySelectorAll('style').forEach((styleEl)=>{
        idMap.forEach((newId, oldId)=>{
            if (styleEl.textContent) {
                styleEl.textContent = styleEl.textContent.replaceAll(`#${oldId}`, `#${newId}`);
            }
        });
    });
};
const IMAGE_QUERY = [
    'img',
    'svg',
    '[role="img"]',
    '[data-zoom]'
].map((x)=>`${x}:not([aria-hidden="true"])`).join(',');
const defaultBodyAttrs = {
    overflow: '',
    width: ''
};
function Controlled(props) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ControlledBase, {
        ...props
    });
}
class ControlledBase extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Component {
    constructor(){
        super(...arguments);
        this.state = {
            id: '',
            isZoomImgLoaded: false,
            loadedImgEl: undefined,
            modalState: "UNLOADED",
            shouldRefresh: false,
            styleGhost: {}
        };
        this.refContent = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createRef();
        this.refDialog = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createRef();
        this.refModalContent = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createRef();
        this.refModalImg = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createRef();
        this.refWrap = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createRef();
        this.imgEl = null;
        this.isScaling = false;
        this.prevBodyAttrs = defaultBodyAttrs;
        this.styleModalImg = {};
        this.handleModalStateChange = (prevModalState)=>{
            const { modalState } = this.state;
            if (prevModalState !== "LOADING" && modalState === "LOADING") {
                this.loadZoomImg();
                window.addEventListener('resize', this.handleResize, {
                    passive: true
                });
                window.addEventListener('touchstart', this.handleTouchStart, {
                    passive: true
                });
                window.addEventListener('touchmove', this.handleTouchMove, {
                    passive: true
                });
                window.addEventListener('touchend', this.handleTouchEnd, {
                    passive: true
                });
                window.addEventListener('touchcancel', this.handleTouchCancel, {
                    passive: true
                });
                document.addEventListener('keydown', this.handleKeyDown, true);
            } else if (prevModalState !== "LOADED" && modalState === "LOADED") {
                window.addEventListener('wheel', this.handleWheel, {
                    passive: true
                });
            } else if (prevModalState !== "UNLOADING" && modalState === "UNLOADING") {
                this.ensureImgTransitionEnd();
                window.removeEventListener('wheel', this.handleWheel);
                window.removeEventListener('touchstart', this.handleTouchStart);
                window.removeEventListener('touchmove', this.handleTouchMove);
                window.removeEventListener('touchend', this.handleTouchEnd);
                window.removeEventListener('touchcancel', this.handleTouchCancel);
                document.removeEventListener('keydown', this.handleKeyDown, true);
            } else if (prevModalState !== "UNLOADED" && modalState === "UNLOADED") {
                this.bodyScrollEnable();
                window.removeEventListener('resize', this.handleResize);
                this.refModalImg.current?.removeEventListener?.('transitionend', this.handleImgTransitionEnd);
                this.refDialog.current?.close?.();
            }
        };
        this.getDialogContainer = ()=>{
            let el = document.querySelector('[data-rmiz-portal]');
            if (el == null) {
                el = document.createElement('div');
                el.setAttribute('data-rmiz-portal', '');
                document.body.appendChild(el);
            }
            return el;
        };
        this.setId = ()=>{
            const gen4 = ()=>Math.random().toString(16).slice(-4);
            this.setState({
                id: gen4() + gen4() + gen4()
            });
        };
        this.setAndTrackImg = ()=>{
            const contentEl = this.refContent.current;
            if (!contentEl) return;
            this.imgEl = contentEl.querySelector(IMAGE_QUERY);
            if (this.imgEl) {
                this.contentNotFoundChangeObserver?.disconnect?.();
                this.imgEl.addEventListener('load', this.handleImgLoad);
                this.imgEl.addEventListener('click', this.handleZoom);
                if (!this.state.loadedImgEl) {
                    this.handleImgLoad();
                }
                this.imgElResizeObserver = new ResizeObserver((entries)=>{
                    const entry = entries[0];
                    if (entry?.target) {
                        this.imgEl = entry.target;
                        this.setState({
                            styleGhost: getStyleGhost(this.imgEl)
                        });
                    }
                });
                this.imgElResizeObserver.observe(this.imgEl);
                if (!this.contentChangeObserver) {
                    this.contentChangeObserver = new MutationObserver(()=>{
                        this.setState({
                            styleGhost: getStyleGhost(this.imgEl)
                        });
                    });
                    this.contentChangeObserver.observe(contentEl, {
                        attributes: true,
                        childList: true,
                        subtree: true
                    });
                }
            } else if (!this.contentNotFoundChangeObserver) {
                this.contentNotFoundChangeObserver = new MutationObserver(this.setAndTrackImg);
                this.contentNotFoundChangeObserver.observe(contentEl, {
                    childList: true,
                    subtree: true
                });
            }
        };
        this.handleIfZoomChanged = (prevIsZoomed)=>{
            const { isZoomed } = this.props;
            if (!prevIsZoomed && isZoomed) {
                this.zoom();
            } else if (prevIsZoomed && !isZoomed) {
                this.unzoom();
            }
        };
        this.handleImgLoad = ()=>{
            const imgSrc = getImgSrc(this.imgEl);
            if (!imgSrc) return;
            const img = new Image();
            if (testImg(this.imgEl)) {
                img.sizes = this.imgEl.sizes;
                img.srcset = this.imgEl.srcset;
            }
            img.src = imgSrc;
            const setLoaded = ()=>{
                this.setState({
                    loadedImgEl: img,
                    styleGhost: getStyleGhost(this.imgEl)
                });
            };
            img.decode().then(setLoaded).catch(()=>{
                if (testImgLoaded(img)) {
                    setLoaded();
                    return;
                }
                img.onload = setLoaded;
            });
        };
        this.handleZoom = ()=>{
            if (this.hasImage()) {
                this.props.onZoomChange?.(true);
            }
        };
        this.handleUnzoom = ()=>{
            this.props.onZoomChange?.(false);
        };
        this.handleBtnUnzoomClick = (e)=>{
            e.preventDefault();
            e.stopPropagation();
            this.handleUnzoom();
        };
        this.handleDialogCancel = (e)=>{
            e.preventDefault();
        };
        this.handleDialogClick = (e)=>{
            if (e.target === this.refModalContent.current || e.target === this.refModalImg.current) {
                e.stopPropagation();
                this.handleUnzoom();
            }
        };
        this.handleDialogClose = (e)=>{
            e.stopPropagation();
            this.handleUnzoom();
        };
        this.handleKeyDown = (e)=>{
            if (e.key === 'Escape' || e.keyCode === 27) {
                e.preventDefault();
                e.stopPropagation();
                this.handleUnzoom();
            }
        };
        this.handleWheel = (e)=>{
            if (e.ctrlKey) return;
            e.stopPropagation();
            queueMicrotask(()=>{
                this.handleUnzoom();
            });
        };
        this.handleTouchStart = (e)=>{
            if (e.touches.length > 1) {
                this.isScaling = true;
                return;
            }
            if (e.changedTouches.length === 1 && e.changedTouches[0]) {
                this.touchYStart = e.changedTouches[0].screenY;
            }
        };
        this.handleTouchMove = (e)=>{
            const browserScale = window.visualViewport?.scale ?? 1;
            if (this.props.canSwipeToUnzoom && !this.isScaling && browserScale <= 1 && this.touchYStart != null && e.changedTouches[0]) {
                this.touchYEnd = e.changedTouches[0].screenY;
                const max = Math.max(this.touchYStart, this.touchYEnd);
                const min = Math.min(this.touchYStart, this.touchYEnd);
                const delta = Math.abs(max - min);
                if (delta > this.props.swipeToUnzoomThreshold) {
                    this.touchYStart = undefined;
                    this.touchYEnd = undefined;
                    this.handleUnzoom();
                }
            }
        };
        this.handleTouchEnd = ()=>{
            this.isScaling = false;
            this.touchYStart = undefined;
            this.touchYEnd = undefined;
        };
        this.handleTouchCancel = ()=>{
            this.isScaling = false;
            this.touchYStart = undefined;
            this.touchYEnd = undefined;
        };
        this.handleResize = ()=>{
            this.setState({
                shouldRefresh: true
            });
        };
        this.hasImage = ()=>{
            return this.imgEl && (this.state.loadedImgEl || testSvg(this.imgEl)) && window.getComputedStyle(this.imgEl).display !== 'none';
        };
        this.zoom = ()=>{
            this.bodyScrollDisable();
            this.refDialog.current?.showModal?.();
            this.refModalImg.current?.addEventListener?.('transitionend', this.handleImgTransitionEnd);
            this.setState({
                modalState: "LOADING"
            });
        };
        this.unzoom = ()=>{
            this.setState({
                modalState: "UNLOADING"
            });
        };
        this.handleImgTransitionEnd = ()=>{
            clearTimeout(this.timeoutTransitionEnd);
            if (this.state.modalState === "LOADING") {
                this.setState({
                    modalState: "LOADED"
                });
            } else if (this.state.modalState === "UNLOADING") {
                this.setState({
                    shouldRefresh: false,
                    modalState: "UNLOADED"
                });
            }
        };
        this.ensureImgTransitionEnd = ()=>{
            if (this.refModalImg.current) {
                const td = window.getComputedStyle(this.refModalImg.current).transitionDuration;
                const tdFloat = parseFloat(td);
                if (tdFloat) {
                    const tdMs = tdFloat * (td.endsWith('ms') ? 1 : 1000) + 50;
                    this.timeoutTransitionEnd = setTimeout(this.handleImgTransitionEnd, tdMs);
                }
            }
        };
        this.bodyScrollDisable = ()=>{
            this.prevBodyAttrs = {
                overflow: document.body.style.overflow,
                width: document.body.style.width
            };
            const clientWidth = document.body.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.width = `${clientWidth}px`;
        };
        this.bodyScrollEnable = ()=>{
            document.body.style.width = this.prevBodyAttrs.width;
            document.body.style.overflow = this.prevBodyAttrs.overflow;
            this.prevBodyAttrs = defaultBodyAttrs;
        };
        this.loadZoomImg = ()=>{
            const { props: { zoomImg } } = this;
            const zoomImgSrc = zoomImg?.src;
            if (zoomImgSrc) {
                const img = new Image();
                img.sizes = zoomImg?.sizes ?? '';
                img.srcset = zoomImg?.srcSet ?? '';
                img.src = zoomImgSrc;
                const setLoaded = ()=>{
                    this.setState({
                        isZoomImgLoaded: true
                    });
                };
                img.decode().then(setLoaded).catch(()=>{
                    if (testImgLoaded(img)) {
                        setLoaded();
                        return;
                    }
                    img.onload = setLoaded;
                });
            }
        };
        this.UNSAFE_handleSvg = ()=>{
            const { imgEl, refModalImg, styleModalImg } = this;
            if (testSvg(imgEl)) {
                const svgEl = imgEl.cloneNode(true);
                adjustSvgIDs(svgEl);
                svgEl.style.width = `${styleModalImg.width || 0}px`;
                svgEl.style.height = `${styleModalImg.height || 0}px`;
                svgEl.addEventListener('click', this.handleUnzoom);
                refModalImg.current?.firstChild?.remove?.();
                refModalImg.current?.appendChild?.(svgEl);
            }
        };
    }
    render() {
        const { handleBtnUnzoomClick, handleDialogCancel, handleDialogClick, handleDialogClose, handleUnzoom, handleZoom, imgEl, props: { a11yNameButtonUnzoom, a11yNameButtonZoom, children, classDialog, IconUnzoom, IconZoom, isZoomed, wrapElement: WrapElement, ZoomContent, zoomImg, zoomMargin }, refContent, refDialog, refModalContent, refModalImg, refWrap, state: { id, isZoomImgLoaded, loadedImgEl, modalState, shouldRefresh, styleGhost } } = this;
        const idModal = `rmiz-modal-${id}`;
        const idModalImg = `rmiz-modal-img-${id}`;
        const isDiv = testDiv(imgEl);
        const isImg = testImg(imgEl);
        const isSvg = testSvg(imgEl);
        const imgAlt = getImgAlt(imgEl);
        const imgSrc = getImgSrc(imgEl);
        const imgSizes = isImg ? imgEl.sizes : undefined;
        const imgSrcSet = isImg ? imgEl.srcset : undefined;
        const hasZoomImg = !!zoomImg?.src;
        const hasImage = this.hasImage();
        const labelBtnZoom = imgAlt ? `${a11yNameButtonZoom}: ${imgAlt}` : a11yNameButtonZoom;
        const isModalActive = modalState === "LOADING" || modalState === "LOADED";
        const dataContentState = hasImage ? 'found' : 'not-found';
        const dataOverlayState = modalState === "UNLOADED" || modalState === "UNLOADING" ? 'hidden' : 'visible';
        const styleContent = {
            visibility: modalState === "UNLOADED" ? 'visible' : 'hidden'
        };
        this.styleModalImg = hasImage ? getStyleModalImg({
            hasZoomImg,
            imgSrc,
            isSvg,
            isZoomed: isZoomed && isModalActive,
            loadedImgEl,
            offset: zoomMargin,
            shouldRefresh,
            targetEl: imgEl
        }) : {};
        let modalContent = null;
        if (hasImage) {
            const modalImg = isImg || isDiv ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("img", {
                alt: imgAlt,
                sizes: imgSizes,
                src: imgSrc,
                srcSet: imgSrcSet,
                ...isZoomImgLoaded && modalState === "LOADED" ? zoomImg : {},
                "data-rmiz-modal-img": "",
                height: this.styleModalImg.height || undefined,
                id: idModalImg,
                ref: refModalImg,
                style: this.styleModalImg,
                width: this.styleModalImg.width || undefined
            }) : isSvg ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("div", {
                "data-rmiz-modal-img": true,
                ref: refModalImg,
                style: this.styleModalImg
            }) : null;
            const modalBtnUnzoom = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("button", {
                "aria-label": a11yNameButtonUnzoom,
                "data-rmiz-btn-unzoom": "",
                onClick: handleBtnUnzoomClick,
                type: "button"
            }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(IconUnzoom, null));
            modalContent = ZoomContent ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ZoomContent, {
                buttonUnzoom: modalBtnUnzoom,
                modalState: modalState,
                img: modalImg,
                onUnzoom: handleUnzoom
            }) : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, modalImg, modalBtnUnzoom);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(WrapElement, {
            "aria-owns": idModal,
            "data-rmiz": "",
            ref: refWrap
        }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(WrapElement, {
            "data-rmiz-content": dataContentState,
            ref: refContent,
            style: styleContent
        }, children), hasImage && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(WrapElement, {
            "data-rmiz-ghost": "",
            style: styleGhost
        }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("button", {
            "aria-label": labelBtnZoom,
            "data-rmiz-btn-zoom": "",
            onClick: handleZoom,
            type: "button"
        }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(IconZoom, null))), hasImage && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createPortal(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("dialog", {
            "aria-labelledby": idModalImg,
            "aria-modal": "true",
            className: classDialog,
            "data-rmiz-modal": "",
            id: idModal,
            onClick: handleDialogClick,
            onClose: handleDialogClose,
            onCancel: handleDialogCancel,
            ref: refDialog,
            role: "dialog"
        }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("div", {
            "data-rmiz-modal-overlay": dataOverlayState
        }), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("div", {
            "data-rmiz-modal-content": "",
            ref: refModalContent
        }, modalContent)), this.getDialogContainer()));
    }
    componentDidMount() {
        this.setId();
        this.setAndTrackImg();
        this.handleImgLoad();
        this.UNSAFE_handleSvg();
    }
    componentWillUnmount() {
        if (this.state.modalState !== "UNLOADED") {
            this.bodyScrollEnable();
        }
        this.contentChangeObserver?.disconnect?.();
        this.contentNotFoundChangeObserver?.disconnect?.();
        this.imgElResizeObserver?.disconnect?.();
        this.imgEl?.removeEventListener?.('load', this.handleImgLoad);
        this.imgEl?.removeEventListener?.('click', this.handleZoom);
        this.refModalImg.current?.removeEventListener?.('transitionend', this.handleImgTransitionEnd);
        window.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('touchcancel', this.handleTouchCancel);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyDown, true);
    }
    componentDidUpdate(prevProps, prevState) {
        this.handleModalStateChange(prevState.modalState);
        this.UNSAFE_handleSvg();
        this.handleIfZoomChanged(prevProps.isZoomed);
    }
}
ControlledBase.defaultProps = {
    a11yNameButtonUnzoom: 'Minimize image',
    a11yNameButtonZoom: 'Expand image',
    canSwipeToUnzoom: true,
    IconUnzoom: ICompress,
    IconZoom: IEnlarge,
    swipeToUnzoomThreshold: 10,
    wrapElement: 'div',
    zoomMargin: 0
};
function Uncontrolled(props) {
    const [isZoomed, setIsZoomed] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(Controlled, {
        ...props,
        isZoomed: isZoomed,
        onZoomChange: setIsZoomed
    });
}
;
}}),
"[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/components/image-zoom.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "ImageZoom": (()=>ImageZoom)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$mdx$2d$components$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/mdx-components/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$medium$2d$image$2d$zoom$40$5$2e$2$2e$13_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$medium$2d$image$2d$zoom$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-medium-image-zoom@5.2.13_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/react-medium-image-zoom/dist/index.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function getImageSrc(src) {
    if (typeof src === "string") {
        return src;
    }
    if ("default" in src) {
        return src.default.src;
    }
    return src.src;
}
const ImageZoom = (props)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(12);
    const imgRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [isInsideAnchor, setIsInsideAnchor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = ()=>{
            setIsInsideAnchor(imgRef.current.closest("a") !== null);
        };
        t1 = [];
        $[0] = t0;
        $[1] = t1;
    } else {
        t0 = $[0];
        t1 = $[1];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t0, t1);
    let t2;
    if ($[2] !== props) {
        t2 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$mdx$2d$components$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Image"], {
            ...props,
            ref: imgRef
        });
        $[2] = props;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const img = t2;
    if (isInsideAnchor) {
        return img;
    }
    let t3;
    if ($[4] !== props.src) {
        t3 = getImageSrc(props.src);
        $[4] = props.src;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    let t4;
    if ($[6] !== props.alt || $[7] !== t3) {
        t4 = {
            src: t3,
            alt: props.alt
        };
        $[6] = props.alt;
        $[7] = t3;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== img || $[10] !== t4) {
        t5 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$medium$2d$image$2d$zoom$40$5$2e$2$2e$13_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$medium$2d$image$2d$zoom$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            zoomMargin: 40,
            zoomImg: t4,
            wrapElement: "span",
            children: img
        });
        $[9] = img;
        $[10] = t4;
        $[11] = t5;
    } else {
        t5 = $[11];
    }
    return t5;
};
;
}}),
"[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/mdx-components/details.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "Details": (()=>Details)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$hooks$2f$use$2d$hash$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/hooks/use-hash.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$components$2f$collapse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/components/collapse.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const Details = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(26);
    let children;
    let className;
    let open;
    let props;
    if ($[0] !== t0) {
        ({ children, open, className, ...props } = t0);
        $[0] = t0;
        $[1] = children;
        $[2] = className;
        $[3] = open;
        $[4] = props;
    } else {
        children = $[1];
        className = $[2];
        open = $[3];
        props = $[4];
    }
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(!!open);
    const [delayedOpenState, setDelayedOpenState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(isOpen);
    const animationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    let t1;
    let t2;
    if ($[5] !== isOpen) {
        t1 = ()=>{
            const animation = animationRef.current;
            if (animation) {
                clearTimeout(animation);
                animationRef.current = 0;
            }
            if (!isOpen) {
                animationRef.current = window.setTimeout(()=>setDelayedOpenState(isOpen), 300);
                return ()=>{
                    clearTimeout(animationRef.current);
                };
            }
            setDelayedOpenState(true);
        };
        t2 = [
            isOpen
        ];
        $[5] = isOpen;
        $[6] = t1;
        $[7] = t2;
    } else {
        t1 = $[6];
        t2 = $[7];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t1, t2);
    let t3;
    if ($[8] !== children) {
        t3 = findSummary(children, setIsOpen);
        $[8] = children;
        $[9] = t3;
    } else {
        t3 = $[9];
    }
    const [summaryElement, restChildren] = t3;
    const hash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$hooks$2f$use$2d$hash$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useHash"])();
    const detailsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t4;
    let t5;
    if ($[10] !== hash) {
        t4 = ()=>{
            if (!hash) {
                return;
            }
            const elementWithHashId = detailsRef.current.querySelector(`[id="${hash}"]`);
            if (!elementWithHashId) {
                return;
            }
            setIsOpen(true);
        };
        t5 = [
            hash
        ];
        $[10] = hash;
        $[11] = t4;
        $[12] = t5;
    } else {
        t4 = $[11];
        t5 = $[12];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t4, t5);
    let t6;
    if ($[13] !== className) {
        t6 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:not-first:mt-4 x:rounded x:border x:border-gray-200 x:bg-white x:p-2 x:shadow-sm x:dark:border-neutral-800 x:dark:bg-neutral-900", "x:overflow-hidden", className);
        $[13] = className;
        $[14] = t6;
    } else {
        t6 = $[14];
    }
    const t7 = isOpen || delayedOpenState;
    const t8 = isOpen ? "" : void 0;
    let t9;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:*:pt-2", "x:grid");
        $[15] = t9;
    } else {
        t9 = $[15];
    }
    let t10;
    if ($[16] !== isOpen || $[17] !== restChildren) {
        t10 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$components$2f$collapse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Collapse"], {
            isOpen,
            className: t9,
            children: restChildren
        });
        $[16] = isOpen;
        $[17] = restChildren;
        $[18] = t10;
    } else {
        t10 = $[18];
    }
    let t11;
    if ($[19] !== props || $[20] !== summaryElement || $[21] !== t10 || $[22] !== t6 || $[23] !== t7 || $[24] !== t8) {
        t11 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])("details", {
            className: t6,
            ref: detailsRef,
            ...props,
            open: t7,
            "data-expanded": t8,
            children: [
                summaryElement,
                t10
            ]
        });
        $[19] = props;
        $[20] = summaryElement;
        $[21] = t10;
        $[22] = t6;
        $[23] = t7;
        $[24] = t8;
        $[25] = t11;
    } else {
        t11 = $[25];
    }
    return t11;
};
function findSummary(list, setIsOpen) {
    let summary;
    const rest = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Children"].map(list, (child)=>{
        if (!summary && // Add onClick only for first summary
        child && typeof child === "object" && "type" in child) {
            if (child.type === "summary") {
                summary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cloneElement"])(child, {
                    // @ts-expect-error -- fixme
                    onClick (event) {
                        if (event.target.tagName !== "A") {
                            event.preventDefault();
                            setIsOpen((v)=>!v);
                        }
                    }
                });
                return;
            }
            if (child.type !== Details && child.props.children) {
                ;
                [summary, child] = findSummary(child.props.children, setIsOpen);
            }
        }
        return child;
    });
    return [
        summary,
        rest
    ];
}
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/mdx-components/heading-anchor.client.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "HeadingAnchor": (()=>HeadingAnchor)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$active$2d$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/active-anchor.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const callback = (entries)=>{
    const entry = entries.find((entry2)=>entry2.isIntersecting);
    if (entry) {
        const slug = entry.target.hash.slice(1);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$active$2d$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setActiveSlug"])(decodeURI(slug));
    }
};
const observer = typeof window === "undefined" ? null : new IntersectionObserver(callback, {
    rootMargin: `-${getComputedStyle(document.body).getPropertyValue("--nextra-navbar-height") || // can be '' on 404 page
    "0%"} 0% -80%`
});
const HeadingAnchor = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(4);
    const { id } = t0;
    const anchorRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    let t1;
    let t2;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = ()=>{
            const el = anchorRef.current;
            observer.observe(el);
            return ()=>{
                observer.unobserve(el);
            };
        };
        t2 = [];
        $[0] = t1;
        $[1] = t2;
    } else {
        t1 = $[0];
        t2 = $[1];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t1, t2);
    const t3 = `#${id}`;
    let t4;
    if ($[2] !== t3) {
        t4 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("a", {
            href: t3,
            className: "x:focus-visible:nextra-focus subheading-anchor",
            "aria-label": "Permalink for this section",
            ref: anchorRef
        });
        $[2] = t3;
        $[3] = t4;
    } else {
        t4 = $[3];
    }
    return t4;
};
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/utils/git-url-parse.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "gitUrlParse": (()=>gitUrlParse)
});
"use no memo";
function gitUrlParse(url) {
    const { href, origin, pathname } = new URL(url);
    const [, owner, name] = pathname.split("/", 3);
    return {
        href,
        origin,
        owner,
        name
    };
}
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/utils/get-git-issue-url.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "getGitIssueUrl": (()=>getGitIssueUrl)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$git$2d$url$2d$parse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/utils/git-url-parse.js [app-ssr] (ecmascript)");
"use no memo";
;
function getGitIssueUrl({ repository = "", title, labels }) {
    const repo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$git$2d$url$2d$parse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gitUrlParse"])(repository);
    if (repo.origin.includes("gitlab")) {
        return `${repo.origin}/${repo.owner}/${repo.name}/-/issues/new?issue[title]=${encodeURIComponent(title)}${labels ? `&issue[description]=/label${encodeURIComponent(` ~${labels}
`)}` : ""}`;
    }
    if (repo.origin.includes("github")) {
        return `${repo.origin}/${repo.owner}/${repo.name}/issues/new?title=${encodeURIComponent(title)}&labels=${labels || ""}`;
    }
    return "#";
}
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/back-to-top.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "BackToTop": (()=>BackToTop)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/icons/arrow-right.js [app-ssr] (ecmascript) <export ReactComponent as ArrowRightIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$components$2f$button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/components/button.js [app-ssr] (ecmascript)");
;
;
;
;
;
const SCROLL_TO_OPTIONS = {
    top: 0,
    behavior: "smooth"
};
const scrollToTop = (event)=>{
    const buttonElement = event.currentTarget;
    const tocElement = buttonElement.parentElement.parentElement;
    window.scrollTo(SCROLL_TO_OPTIONS);
    tocElement.scrollTo(SCROLL_TO_OPTIONS);
    buttonElement.disabled = true;
};
const BackToTop = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(8);
    const { children, className, hidden } = t0;
    const t1 = hidden ? "true" : void 0;
    let t2;
    if ($[0] !== className) {
        t2 = (t32)=>{
            const { disabled } = t32;
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:flex x:items-center x:gap-1.5", "x:whitespace-nowrap", disabled ? "x:opacity-0" : "x:opacity-100", className);
        };
        $[0] = className;
        $[1] = t2;
    } else {
        t2 = $[1];
    }
    let t3;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__["ArrowRightIcon"], {
            height: "1.1em",
            className: "x:-rotate-90 x:border x:rounded-full x:border-current"
        });
        $[2] = t3;
    } else {
        t3 = $[2];
    }
    let t4;
    if ($[3] !== children || $[4] !== hidden || $[5] !== t1 || $[6] !== t2) {
        t4 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$components$2f$button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
            "aria-hidden": t1,
            onClick: scrollToTop,
            disabled: hidden,
            className: t2,
            children: [
                children,
                t3
            ]
        });
        $[3] = children;
        $[4] = hidden;
        $[5] = t1;
        $[6] = t2;
        $[7] = t4;
    } else {
        t4 = $[7];
    }
    return t4;
};
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/toc.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "TOC": (()=>TOC)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$active$2d$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/active-anchor.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/theme-config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$scroll$2d$into$2d$view$2d$if$2d$needed$40$3$2e$1$2e$0$2f$node_modules$2f$scroll$2d$into$2d$view$2d$if$2d$needed$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/scroll-into-view-if-needed@3.1.0/node_modules/scroll-into-view-if-needed/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$mdx$2d$components$2f$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/mdx-components/anchor.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$get$2d$git$2d$issue$2d$url$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/utils/get-git-issue-url.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$git$2d$url$2d$parse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/utils/git-url-parse.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$back$2d$to$2d$top$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/back-to-top.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
const linkClassName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:text-xs x:font-medium x:transition", "x:text-gray-600 x:dark:text-gray-400", "x:hover:text-gray-800 x:dark:hover:text-gray-200", "x:contrast-more:text-gray-700 x:contrast-more:dark:text-gray-100");
const TOC = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(30);
    const { toc, filePath, pageTitle } = t0;
    const activeSlug = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$active$2d$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useActiveAnchor"])();
    const tocRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const themeConfig = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useThemeConfig"])();
    const hasMetaInfo = themeConfig.feedback.content || themeConfig.editLink || themeConfig.toc.extraContent || themeConfig.toc.backToTop;
    const { activeType } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConfig"])().normalizePagesResult;
    let t1;
    if ($[0] !== activeType || $[1] !== themeConfig.toc.float || $[2] !== toc) {
        t1 = themeConfig.toc.float || activeType === "page" ? toc : [];
        $[0] = activeType;
        $[1] = themeConfig.toc.float;
        $[2] = toc;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    const anchors = t1;
    const hasHeadings = anchors.length > 0;
    let t2;
    if ($[4] !== activeSlug) {
        t2 = (t32)=>{
            const { id } = t32;
            return id === activeSlug;
        };
        $[4] = activeSlug;
        $[5] = t2;
    } else {
        t2 = $[5];
    }
    const activeIndex = toc.findIndex(t2);
    let t3;
    let t4;
    if ($[6] !== activeSlug) {
        t3 = ()=>{
            if (!activeSlug) {
                return;
            }
            const anchor = tocRef.current?.querySelector(`a[href="#${activeSlug}"]`);
            if (!anchor) {
                return;
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$scroll$2d$into$2d$view$2d$if$2d$needed$40$3$2e$1$2e$0$2f$node_modules$2f$scroll$2d$into$2d$view$2d$if$2d$needed$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(anchor, {
                behavior: "smooth",
                block: "center",
                inline: "center",
                scrollMode: "if-needed",
                boundary: tocRef.current
            });
        };
        t4 = [
            activeSlug
        ];
        $[6] = activeSlug;
        $[7] = t3;
        $[8] = t4;
    } else {
        t3 = $[7];
        t4 = $[8];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t3, t4);
    let t5;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:grid x:grid-rows-[min-content_1fr_min-content]", "x:sticky x:top-(--nextra-navbar-height) x:text-sm", "x:max-h-[calc(100vh-var(--nextra-navbar-height))]");
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    let t6;
    if ($[10] !== activeSlug || $[11] !== anchors || $[12] !== hasHeadings || $[13] !== themeConfig.toc.title) {
        t6 = hasHeadings && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("p", {
                    className: "x:pt-6 x:px-4 x:font-semibold x:tracking-tight",
                    children: themeConfig.toc.title
                }),
                /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("ul", {
                    ref: tocRef,
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:p-4 nextra-scrollbar x:overscroll-y-contain x:overflow-y-auto x:hyphens-auto", "nextra-mask"),
                    children: anchors.map((t72)=>{
                        const { id: id_0, value, depth } = t72;
                        return /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("li", {
                            className: "x:my-2 x:scroll-my-6 x:scroll-py-6",
                            children: /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("a", {
                                href: `#${id_0}`,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:focus-visible:nextra-focus", {
                                    2: "x:font-semibold",
                                    3: "x:ms-3",
                                    4: "x:ms-6",
                                    5: "x:ms-9",
                                    6: "x:ms-12"
                                }[depth], "x:block x:transition-colors x:subpixel-antialiased", id_0 === activeSlug ? "x:text-primary-600 x:contrast-more:text-primary-600!" : "x:text-gray-500 x:hover:text-gray-900 x:dark:text-gray-400 x:dark:hover:text-gray-300", "x:contrast-more:text-gray-900 x:contrast-more:underline x:contrast-more:dark:text-gray-50 x:break-words"),
                                children: value
                            })
                        }, id_0);
                    })
                })
            ]
        });
        $[10] = activeSlug;
        $[11] = anchors;
        $[12] = hasHeadings;
        $[13] = themeConfig.toc.title;
        $[14] = t6;
    } else {
        t6 = $[14];
    }
    let t7;
    if ($[15] !== activeIndex || $[16] !== filePath || $[17] !== hasHeadings || $[18] !== hasMetaInfo || $[19] !== pageTitle || $[20] !== themeConfig.docsRepositoryBase || $[21] !== themeConfig.editLink || $[22] !== themeConfig.feedback.content || $[23] !== themeConfig.feedback.labels || $[24] !== themeConfig.toc.backToTop || $[25] !== themeConfig.toc.extraContent) {
        t7 = hasMetaInfo && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])("div", {
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:grid x:gap-2 x:py-4 x:mx-4", hasHeadings && "x:border-t nextra-border"),
            children: [
                themeConfig.feedback.content && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$mdx$2d$components$2f$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Anchor"], {
                    className: linkClassName,
                    href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$get$2d$git$2d$issue$2d$url$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getGitIssueUrl"])({
                        labels: themeConfig.feedback.labels,
                        repository: themeConfig.docsRepositoryBase,
                        title: `Feedback for \u201C${pageTitle}\u201D`
                    }),
                    children: themeConfig.feedback.content
                }),
                filePath && themeConfig.editLink && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$mdx$2d$components$2f$anchor$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Anchor"], {
                    className: linkClassName,
                    href: filePath.startsWith("http") ? filePath : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$utils$2f$git$2d$url$2d$parse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gitUrlParse"])(themeConfig.docsRepositoryBase).href}/${filePath}`,
                    children: themeConfig.editLink
                }),
                themeConfig.toc.extraContent,
                themeConfig.toc.backToTop && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$back$2d$to$2d$top$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BackToTop"], {
                    className: linkClassName,
                    hidden: activeIndex < 2,
                    children: themeConfig.toc.backToTop
                })
            ]
        });
        $[15] = activeIndex;
        $[16] = filePath;
        $[17] = hasHeadings;
        $[18] = hasMetaInfo;
        $[19] = pageTitle;
        $[20] = themeConfig.docsRepositoryBase;
        $[21] = themeConfig.editLink;
        $[22] = themeConfig.feedback.content;
        $[23] = themeConfig.feedback.labels;
        $[24] = themeConfig.toc.backToTop;
        $[25] = themeConfig.toc.extraContent;
        $[26] = t7;
    } else {
        t7 = $[26];
    }
    let t8;
    if ($[27] !== t6 || $[28] !== t7) {
        t8 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])("div", {
            className: t5,
            children: [
                t6,
                t7
            ]
        });
        $[27] = t6;
        $[28] = t7;
        $[29] = t8;
    } else {
        t8 = $[29];
    }
    return t8;
};
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/breadcrumb.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "Breadcrumb": (()=>Breadcrumb)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/icons/arrow-right.js [app-ssr] (ecmascript) <export ReactComponent as ArrowRightIcon>");
;
;
;
;
;
;
const Breadcrumb = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(4);
    const { activePath } = t0;
    let t1;
    if ($[0] !== activePath) {
        t1 = activePath.map(_temp);
        $[0] = activePath;
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    let t2;
    if ($[2] !== t1) {
        t2 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("div", {
            className: "nextra-breadcrumb x:mt-1.5 x:flex x:items-center x:gap-1 x:overflow-hidden x:text-sm x:text-gray-500 x:dark:text-gray-400 x:contrast-more:text-current",
            children: t1
        });
        $[2] = t1;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    return t2;
};
function _temp(item, index, arr) {
    const nextItem = arr[index + 1];
    const href = nextItem ? "frontMatter" in item ? item.route : item.children[0].route === nextItem.route ? "" : item.children[0].route : "";
    const ComponentToUse = href ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"] : "span";
    return /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            index > 0 && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__["ArrowRightIcon"], {
                height: "14",
                className: "x:shrink-0 x:rtl:rotate-180"
            }),
            /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(ComponentToUse, {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:whitespace-nowrap x:transition-colors", nextItem ? "x:min-w-6 x:overflow-hidden x:text-ellipsis" : "x:font-medium x:text-gray-700 x:dark:text-gray-100", href && "x:focus-visible:nextra-focus x:ring-inset x:hover:text-gray-900 x:dark:hover:text-gray-100"),
                title: item.title,
                ...href && {
                    href
                },
                children: item.title
            })
        ]
    }, item.route + item.name);
}
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/pagination.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "Pagination": (()=>Pagination)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/theme-config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra@4.2.12_acorn@8.14.0_next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1__react-dom_homffl5mwc6gzulg6hateyorfm/node_modules/nextra/dist/client/icons/arrow-right.js [app-ssr] (ecmascript) <export ReactComponent as ArrowRightIcon>");
;
;
;
;
;
;
const classes = {
    link: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:focus-visible:nextra-focus x:text-gray-600 x:dark:text-gray-400", "x:hover:text-gray-800 x:dark:hover:text-gray-200", "x:contrast-more:text-gray-700 x:contrast-more:dark:text-gray-100", "x:flex x:max-w-[50%] x:items-center x:gap-1 x:py-4 x:text-base x:font-medium x:transition-colors x:[word-break:break-word] x:md:text-lg"),
    icon: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:inline x:shrink-0")
};
const Pagination = ()=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(8);
    const { flatDocsDirectories, activeIndex } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConfig"])().normalizePagesResult;
    const { navigation } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useThemeConfig"])();
    let prev = navigation.prev && flatDocsDirectories[activeIndex - 1];
    let next = navigation.next && flatDocsDirectories[activeIndex + 1];
    if (prev && !prev.isUnderCurrentDocsTree) {
        prev = false;
    }
    if (next && !next.isUnderCurrentDocsTree) {
        next = false;
    }
    if (!prev && !next) {
        return null;
    }
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:mb-8 x:flex x:items-center x:border-t x:pt-8 nextra-border", "x:print:hidden");
        $[0] = t0;
    } else {
        t0 = $[0];
    }
    let t1;
    if ($[1] !== prev) {
        t1 = prev && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            href: prev.route,
            title: prev.title,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(classes.link, "x:pe-4"),
            children: [
                /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__["ArrowRightIcon"], {
                    height: "20",
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(classes.icon, "x:ltr:rotate-180")
                }),
                prev.title
            ]
        });
        $[1] = prev;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== next) {
        t2 = next && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            href: next.route,
            title: next.title,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(classes.link, "x:ps-4 x:ms-auto x:text-end"),
            children: [
                next.title,
                /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$40$4$2e$2$2e$12_acorn$40$8$2e$14$2e$0_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1_$5f$react$2d$dom_homffl5mwc6gzulg6hateyorfm$2f$node_modules$2f$nextra$2f$dist$2f$client$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__ReactComponent__as__ArrowRightIcon$3e$__["ArrowRightIcon"], {
                    height: "20",
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(classes.icon, "x:rtl:rotate-180")
                })
            ]
        });
        $[3] = next;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== t1 || $[6] !== t2) {
        t3 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])("div", {
            className: t0,
            children: [
                t1,
                t2
            ]
        });
        $[5] = t1;
        $[6] = t2;
        $[7] = t3;
    } else {
        t3 = $[7];
    }
    return t3;
};
;
}}),
"[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/mdx-components/wrapper.client.js [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "ClientWrapper": (()=>ClientWrapper)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/react-compiler-runtime@0.0.0-experimental-22c6e49-20241219_react@18.3.1/node_modules/react-compiler-runtime/dist/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/theme-config.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$toc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/stores/toc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$toc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/toc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$breadcrumb$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/breadcrumb.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/nextra-theme-docs@4.2.12_@types+react@19.0.10_next@15.1.6_react-dom@18.3.1_react@18.3.1__reac_aye3f3vho6ufzkrvog7nzbcaa4/node_modules/nextra-theme-docs/dist/components/pagination.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const ClientWrapper = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$react$2d$compiler$2d$runtime$40$0$2e$0$2e$0$2d$experimental$2d$22c6e49$2d$20241219_react$40$18$2e$3$2e$1$2f$node_modules$2f$react$2d$compiler$2d$runtime$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["c"])(30);
    const { toc, children, metadata, bottomContent } = t0;
    const { activeType, activeThemeContext: themeContext, activePath } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConfig"])().normalizePagesResult;
    const themeConfig = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$theme$2d$config$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useThemeConfig"])();
    const date = themeContext.timestamp && metadata.timestamp;
    let t1;
    let t2;
    if ($[0] !== toc) {
        t1 = ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$stores$2f$toc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setToc"])(toc);
        };
        t2 = [
            toc
        ];
        $[0] = toc;
        $[1] = t1;
        $[2] = t2;
    } else {
        t1 = $[1];
        t2 = $[2];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(t1, t2);
    let t3;
    if ($[3] !== metadata || $[4] !== themeContext.layout || $[5] !== themeContext.toc || $[6] !== toc) {
        t3 = (themeContext.layout === "default" || themeContext.toc) && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("nav", {
            className: "nextra-toc x:order-last x:max-xl:hidden x:w-64 x:shrink-0 x:print:hidden",
            "aria-label": "table of contents",
            children: themeContext.toc && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$toc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TOC"], {
                toc,
                filePath: metadata.filePath,
                pageTitle: metadata.title
            })
        });
        $[3] = metadata;
        $[4] = themeContext.layout;
        $[5] = themeContext.toc;
        $[6] = toc;
        $[7] = t3;
    } else {
        t3 = $[7];
    }
    const t4 = themeContext.typesetting === "article" && "nextra-body-typesetting-article";
    let t5;
    if ($[8] !== t4) {
        t5 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("x:w-full x:min-w-0 x:break-words x:min-h-[calc(100vh-var(--nextra-navbar-height))]", "x:text-slate-700 x:dark:text-slate-200 x:pb-8 x:px-4 x:pt-4 x:md:px-12", t4);
        $[8] = t4;
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    let t6;
    if ($[10] !== activePath || $[11] !== activeType || $[12] !== themeContext.breadcrumb) {
        t6 = themeContext.breadcrumb && activeType !== "page" && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$breadcrumb$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Breadcrumb"], {
            activePath
        });
        $[10] = activePath;
        $[11] = activeType;
        $[12] = themeContext.breadcrumb;
        $[13] = t6;
    } else {
        t6 = $[13];
    }
    let t7;
    if ($[14] !== date || $[15] !== themeConfig) {
        t7 = date ? /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("div", {
            className: "x:mt-12 x:mb-8 x:text-xs x:text-gray-500 x:text-end x:dark:text-gray-400",
            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cloneElement"])(themeConfig.lastUpdated, {
                date: new Date(date)
            })
        }) : /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])("div", {
            className: "x:mt-16"
        });
        $[14] = date;
        $[15] = themeConfig;
        $[16] = t7;
    } else {
        t7 = $[16];
    }
    let t8;
    if ($[17] !== activeType || $[18] !== themeContext.pagination) {
        t8 = themeContext.pagination && activeType !== "page" && /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$nextra$2d$theme$2d$docs$40$4$2e$2$2e$12_$40$types$2b$react$40$19$2e$0$2e$10_next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$reac_aye3f3vho6ufzkrvog7nzbcaa4$2f$node_modules$2f$nextra$2d$theme$2d$docs$2f$dist$2f$components$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Pagination"], {});
        $[17] = activeType;
        $[18] = themeContext.pagination;
        $[19] = t8;
    } else {
        t8 = $[19];
    }
    let t9;
    if ($[20] !== bottomContent || $[21] !== children || $[22] !== t5 || $[23] !== t6 || $[24] !== t7 || $[25] !== t8) {
        t9 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])("article", {
            className: t5,
            children: [
                t6,
                children,
                t7,
                t8,
                bottomContent
            ]
        });
        $[20] = bottomContent;
        $[21] = children;
        $[22] = t5;
        $[23] = t6;
        $[24] = t7;
        $[25] = t8;
        $[26] = t9;
    } else {
        t9 = $[26];
    }
    let t10;
    if ($[27] !== t3 || $[28] !== t9) {
        t10 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                t3,
                t9
            ]
        });
        $[27] = t3;
        $[28] = t9;
        $[29] = t10;
    } else {
        t10 = $[29];
    }
    return t10;
};
;
}}),

};

//# sourceMappingURL=08b5e__pnpm_425a06._.js.map