import JSZip from 'jszip';

// Ensures the script runs after the DOM has fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('selectImagesButton');

    // Debugging line to ensure script has reached this point without issue.
    console.log("DOMContentLoaded, button:", button);

    button.addEventListener('click', () => {
        console.log('Button clicked');
        button.disabled = true;
        button.textContent = 'Processing...';
        parent.postMessage({ pluginMessage: { type: 'button-clicked' } }, '*');
    });

    window.onmessage = async event => {
        const { pluginMessage } = event.data;
        console.log("Message received from code.ts:", pluginMessage);

        if (pluginMessage.type === 'images-data') {
            const { imagesData } = pluginMessage;
            const zip = new JSZip();
            
            imagesData.forEach(({ base64, fileName }) => {
                // Assuming the prefix is present and splitting to get raw base64 data.
                const base64Data = base64.split(',')[1];
                zip.file(fileName, base64Data, { base64: true });
            });

            zip.generateAsync({ type: "blob" })
                .then(content => {
                    saveAs(content, "images.zip");
                    button.disabled = false;
                    button.textContent = 'Download Images';
                })
                .catch(error => {
                    console.error('Error generating zip file:', error);
                    button.disabled = false;
                    button.textContent = 'Download Failed - Try Again';
                });
        }
    };

    function saveAs(blob, fileName) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
