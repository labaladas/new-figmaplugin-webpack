"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 240, height: 100 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Message received from UI:", msg);
    if (msg.type === 'button-clicked') {
        try {
            const allImages = yield selectAllImagesInSelectedFrames();
            // Log and visually select the nodes with image fills
            figma.currentPage.selection = allImages;
            console.log(`${allImages.length} images selected in the selected frame(s).`);
            // Introduce a short delay to observe the selection
            yield new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
            // Continue with processing if there are images
            if (allImages.length > 0) {
                // Compile the images to Base64 and gather data
                const imagesData = yield compileImagesData(allImages);
                // Log the imagesData array to the console for debugging
                console.log('Compiled images data array:', imagesData);
                // Send all images data together to the UI for download
                figma.ui.postMessage({ pluginMessage: { type: 'images-data', imagesData } });
            }
            else {
                console.log("No images found in the selected frames.");
            }
            // Notify UI of success or that the process is complete
            figma.ui.postMessage({ pluginMessage: { type: 'download-complete', status: 'success' } });
        }
        catch (error) {
            console.error("An error occurred:", error);
            // Notify UI of failure
            figma.ui.postMessage({ pluginMessage: { type: 'download-complete', status: 'failure' } });
        }
    }
});
function selectAllImagesInSelectedFrames() {
    return __awaiter(this, void 0, void 0, function* () {
        const selectedNodes = figma.currentPage.selection;
        const selectedFrames = selectedNodes.filter(node => node.type === 'FRAME');
        if (selectedFrames.length === 0) {
            console.log("No selected frame(s) found.");
            return [];
        }
        let allImages = [];
        selectedFrames.forEach(frame => {
            allImages = allImages.concat(findAllImages(frame, []));
        });
        return allImages;
    });
}
function findAllImages(node, images) {
    if ('fills' in node && Array.isArray(node.fills)) {
        node.fills.forEach((fill) => {
            if (fill.type === 'IMAGE') {
                images.push(node);
            }
        });
    }
    if ('children' in node) {
        node.children.forEach((child) => {
            findAllImages(child, images);
        });
    }
    return images;
}
function compileImagesData(allImages) {
    return __awaiter(this, void 0, void 0, function* () {
        const imagePromises = allImages.map((node) => __awaiter(this, void 0, void 0, function* () {
            if ('fills' in node) {
                const fills = node.fills;
                for (const fill of fills) {
                    if (fill.type === 'IMAGE' && fill.imageHash) {
                        const image = figma.getImageByHash(fill.imageHash);
                        if (image) {
                            const bytes = yield image.getBytesAsync();
                            const base64 = arrayBufferToBase64(bytes);
                            return { base64, fileName: node.name || 'image.png' }; // Ensure there's a default filename
                        }
                    }
                }
            }
        }));
        const imagesData = (yield Promise.all(imagePromises)).filter((item) => item !== undefined);
        return imagesData;
    });
}
function arrayBufferToBase64(buffer) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '', enc1, enc2, enc3, enc4;
    let i = 0;
    while (i < buffer.length) {
        const byte1 = buffer[i++] || 0;
        const byte2 = i < buffer.length ? buffer[i++] : 0;
        const byte3 = i < buffer.length ? buffer[i++] : 0;
        enc1 = byte1 >> 2;
        enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
        enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
        enc4 = byte3 & 63;
        if (!byte2) {
            enc3 = enc4 = 64;
        }
        else if (!byte3) {
            enc4 = 64;
        }
        base64 += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    return base64;
}
