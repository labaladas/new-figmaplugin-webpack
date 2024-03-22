figma.showUI(__html__, { width: 240, height: 100 });

figma.ui.onmessage = async msg => {
  console.log("Message received from UI:", msg);

  if (msg.type === 'button-clicked') {
    try {
      const allImages = await selectAllImagesInSelectedFrames();
      // Log and visually select the nodes with image fills
      figma.currentPage.selection = allImages;
      console.log(`${allImages.length} images selected in the selected frame(s).`);

      // Introduce a short delay to observe the selection
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay

      // Continue with processing if there are images
      if (allImages.length > 0) {
        // Compile the images to Base64 and gather data
        const imagesData = await compileImagesData(allImages);
        
        // Log the imagesData array to the console for debugging
        console.log('Compiled images data array:', imagesData);

        // Send all images data together to the UI for download
        figma.ui.postMessage({ pluginMessage: { type: 'images-data', imagesData } });
      } else {
        console.log("No images found in the selected frames.");
      }

      // Notify UI of success or that the process is complete
      figma.ui.postMessage({ pluginMessage: { type: 'download-complete', status: 'success' } });
    } catch (error) {
      console.error("An error occurred:", error);
      // Notify UI of failure
      figma.ui.postMessage({ pluginMessage: { type: 'download-complete', status: 'failure' } });
    }
  }
};


async function selectAllImagesInSelectedFrames(): Promise<SceneNode[]> {
  const selectedNodes = figma.currentPage.selection;
  const selectedFrames = selectedNodes.filter(node => node.type === 'FRAME') as FrameNode[];

  if (selectedFrames.length === 0) {
    console.log("No selected frame(s) found.");
    return [];
  }

  let allImages: SceneNode[] = [];
  selectedFrames.forEach(frame => {
    allImages = allImages.concat(findAllImages(frame, []));
  });

  return allImages;
}

function findAllImages(node: SceneNode, images: SceneNode[]): SceneNode[] {
  if ('fills' in node && Array.isArray(node.fills)) {
    node.fills.forEach((fill: Paint) => {
      if (fill.type === 'IMAGE') {
        images.push(node);
      }
    });
  }

  if ('children' in node) {
    node.children.forEach((child: SceneNode) => {
      findAllImages(child, images);
    });
  }

  return images;
}

async function compileImagesData(allImages: SceneNode[]): Promise<{ base64: string, fileName: string }[]> {
  const imagePromises = allImages.map(async (node) => {
    if ('fills' in node) {
      const fills: Paint[] = node.fills as Paint[];
      for (const fill of fills) {
        if (fill.type === 'IMAGE' && fill.imageHash) {
          const image = figma.getImageByHash(fill.imageHash);
          if (image) {
            const bytes = await image.getBytesAsync();
            const base64 = arrayBufferToBase64(bytes);
            return { base64, fileName: node.name || 'image.png' }; // Ensure there's a default filename
          }
        }
      }
    }
  });

  const imagesData = (await Promise.all(imagePromises)).filter((item): item is { base64: string, fileName: string } => item !== undefined);
  return imagesData;
}




function arrayBufferToBase64(buffer: Uint8Array): string {
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
    } else if (!byte3) {
      enc4 = 64;
    }

    base64 += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return base64;
}
