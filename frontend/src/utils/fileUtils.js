/**
 * Utility function to download a file from a specified path
 * @param {string} filePath - Path to the file to be downloaded
 * @param {string} fileName - Name for the downloaded file
 * @param {boolean} [isBinary=false] - Whether the file should be treated as binary
 * @returns {Promise} A promise that resolves when the file is downloaded
 */
export const downloadFile = async (filePath, fileName, isBinary = false) => {
  try {
    // Determine if the file is binary based on provided flag or extension
    const shouldTreatAsBinary =
      isBinary || /\.(exe|app|bin|dll|so|dylib)$/i.test(fileName);

    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Handle binary or text file appropriately
    let blob;
    if (shouldTreatAsBinary) {
      // For binary files, use arrayBuffer
      const buffer = await response.arrayBuffer();
      blob = new Blob([buffer], {
        type: fileName.endsWith('.exe')
          ? 'application/x-msdownload'
          : 'application/octet-stream',
      });
    } else {
      // For text files, use text
      const fileContent = await response.text();
      blob = new Blob([fileContent], { type: 'text/plain' });
    }

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Force the browser to download as a specific file type
    if (shouldTreatAsBinary) {
      link.setAttribute('type', 'application/octet-stream');
    }

    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    return false;
  }
};

/**
 * Gets the appropriate script file path based on operating system
 * @param {string} osType - The operating system ('darwin', 'win32', 'linux')
 * @returns {object} The path and filename for the appropriate executable
 */
export const getOsSpecificScriptPath = (osType) => {
  switch (osType) {
    case 'darwin':
      return {
        path: 'https://drive.google.com/file/d/1uJtJ7AfVgoZZiP6Dkjl4Z38dsiYY0d6C/view?usp=sharing',
        filename: 'TrueInterview Monitor-1.0.0-arm64.dmg',
        isBinary: true,
      };
    case 'win32':
      return {
        path: 'https://drive.google.com/file/d/1h4SghLy_6w4OSP9R1p6Iy8t5QT7XVbRS/view?usp=sharing',
        filename: 'TrueInterview Monitor Setup 1.0.0.exe',
        isBinary: true,
      };
    case 'linux':
      return {
        path: 'https://drive.google.com/file/d/1IOY-LExai4AzizaZYjWcp7-ElcKupYej/view?usp=drive_link',
        filename: 'monitor.py',
        isBinary: false,
      };
    default:
      // Fallback to mac version
      console.warn(`Unknown OS type: ${osType}, falling back to mac version`);
      return {
        path: 'https://drive.google.com/file/d/1uJtJ7AfVgoZZiP6Dkjl4Z38dsiYY0d6C/view?usp=sharing',
        filename: 'TrueInterview Monitor-1.0.0-arm64.dmg',
        isBinary: true,
      };
  }
};

/**
 * Downloads a text file with custom replacements in the content
 * @param {string} filePath - Path to the file to be downloaded
 * @param {string} fileName - Name for the downloaded file
 * @param {Object} replacements - Key-value pairs of text to find and replace
 * @returns {Promise} A promise that resolves when the file is downloaded
 */
export const downloadFileWithReplacements = async (
  filePath,
  fileName,
  replacements
) => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Get the file content and apply replacements
    let fileContent = await response.text();

    // Apply all replacements
    Object.entries(replacements).forEach(([searchText, replaceText]) => {
      fileContent = fileContent.replace(searchText, replaceText);
    });

    // Create a download blob with the modified content
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading file with replacements:', error);
    return false;
  }
};
