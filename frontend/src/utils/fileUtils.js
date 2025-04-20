/**
 * Utility function to download a text file from a specified path
 * @param {string} filePath - Path to the file to be downloaded
 * @param {string} fileName - Name for the downloaded file
 * @returns {Promise} A promise that resolves when the file is downloaded
 */
export const downloadFile = async (filePath, fileName) => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const fileContent = await response.text();
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
    console.error('Error downloading file:', error);
    return false;
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
