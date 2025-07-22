const fs = require("fs");

/**
 * Send a WhatsApp message with optional attachments
 */
async function sendMessage({
  sock,
  jid,
  message,
  attachment_thumbnail = [],
  attachment_document = [],
}) {
  // Ensure attachments are arrays
  attachment_thumbnail = Array.isArray(attachment_thumbnail)
    ? attachment_thumbnail
    : [];
  attachment_document = Array.isArray(attachment_document)
    ? attachment_document
    : [];

  console.log(`Sending message to ${jid}`);

  try {
    // Case 1: Only a text message, no attachments
    if (
      message &&
      attachment_thumbnail.length === 0 &&
      attachment_document.length === 0
    ) {
      await sock.sendMessage(jid, { text: message });
      return;
    }

    // Case 2: Single thumbnail attachment
    if (attachment_thumbnail.length === 1 && attachment_document.length === 0) {
      await sendSingleThumbnail(sock, jid, message, attachment_thumbnail[0]);
      return;
    }

    // Case 3: Multiple thumbnails
    if (attachment_thumbnail.length > 1) {
      await sendMultipleThumbnails(sock, jid, message, attachment_thumbnail);
      return;
    }

    // Case 4: Single document attachment
    if (attachment_document.length === 1 && attachment_thumbnail.length === 0) {
      await sendSingleDocument(sock, jid, message, attachment_document[0]);
      return;
    }

    // Case 5: Multiple documents
    if (attachment_document.length > 1) {
      await sendMultipleDocuments(sock, jid, message, attachment_document);
      return;
    }

    // Case 6: Mixed attachments (both thumbnails and documents)
    if (attachment_thumbnail.length > 0 && attachment_document.length > 0) {
      // Send text message first if provided
      if (message) {
        await sock.sendMessage(jid, { text: message });
      }

      // Then send all thumbnails
      for (const thumb of attachment_thumbnail) {
        await sendSingleThumbnail(sock, jid, "", thumb);
      }

      // Then send all documents
      for (const doc of attachment_document) {
        await sendSingleDocument(sock, jid, "", doc);
      }
      return;
    }
  } catch (error) {
    console.error(`Error sending message to ${jid}: ${error.message}`);
    // If all else fails, try to send just the text message
    if (message) {
      try {
        await sock.sendMessage(jid, { text: message });
        console.log(`Sent text-only message to ${jid} as fallback`);
      } catch (textError) {
        console.error(
          `Failed to send fallback text message: ${textError.message}`
        );
      }
    }
    throw error; // Re-throw for proper logging
  }
}

/**
 * Helper function to verify file existence
 */
function verifyFile(filePath) {
  if (!filePath) {
    console.error("File path is missing in attachment");
    throw new Error("File path is missing");
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found at path: ${filePath}`);
    // Try to show directory contents to help debugging
    try {
      const path = require("path");
      const dir = path.dirname(filePath);
      console.log(`File details: ${filePath}`);
      console.log(`- Filename: ${path.basename(filePath)}`);
      console.log(`- Directory: ${dir}`);

      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log(`Files in directory ${dir} (${files.length} files):`);
        files.forEach((file) => {
          const stats = fs.statSync(path.join(dir, file));
          console.log(
            `  - ${file} (${stats.isDirectory() ? "directory" : "file"}, ${
              stats.size
            } bytes)`
          );
        });
      } else {
        console.log(`Directory doesn't exist: ${dir}`);
        // Try to list parent directory
        const parentDir = path.dirname(dir);
        if (fs.existsSync(parentDir)) {
          console.log(`Parent directory exists: ${parentDir}`);
          const parentFiles = fs.readdirSync(parentDir);
          console.log(
            `Files in parent directory (${parentFiles.length} items):`
          );
          parentFiles.forEach((file) => {
            console.log(`  - ${file}`);
          });
        } else {
          console.log(`Parent directory doesn't exist: ${parentDir}`);
        }
      }
    } catch (dirErr) {
      console.error("Error checking directory:", dirErr.message);
    }
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.warn(`Warning: File exists but is empty (0 bytes): ${filePath}`);
    } else {
      console.log(`File verified: ${filePath} (${stats.size} bytes)`);
    }
  } catch (statErr) {
    console.error(`Error checking file stats: ${statErr.message}`);
  }

  return true;
}

/**
 * Send a single thumbnail attachment
 */
async function sendSingleThumbnail(sock, jid, message, thumb) {
  try {
    verifyFile(thumb.path);

    const mime = thumb.type;
    let mediaMessage = { caption: message || "" };

    if (mime.startsWith("image/")) {
      mediaMessage.image = { url: thumb.path };
    } else if (mime.startsWith("video/")) {
      mediaMessage.video = { url: thumb.path };
    } else {
      mediaMessage.document = { url: thumb.path };
      mediaMessage.mimetype = mime;
      mediaMessage.fileName = thumb.filename;
    }

    await sock.sendMessage(jid, mediaMessage);
    return true;
  } catch (error) {
    console.error(`Error sending thumbnail: ${error.message}`);
    if (message) {
      // If file send fails but we have a message, send just the text
      await sock.sendMessage(jid, { text: message });
    }
    throw error;
  }
}

/**
 * Send multiple thumbnail attachments
 */
async function sendMultipleThumbnails(sock, jid, message, thumbnails) {
  // Send the first thumbnail with the caption (message)
  if (thumbnails.length > 0) {
    await sendSingleThumbnail(sock, jid, message, thumbnails[0]);

    // Send the remaining thumbnails without captions
    for (let i = 1; i < thumbnails.length; i++) {
      await sendSingleThumbnail(sock, jid, "", thumbnails[i]);
    }
  } else if (message) {
    // If no thumbnails but we have a message, send just the text
    await sock.sendMessage(jid, { text: message });
  }
}

/**
 * Send a single document attachment
 */
async function sendSingleDocument(sock, jid, message, doc) {
  try {
    verifyFile(doc.path);

    const mime = doc.type;
    let mediaMessage = { caption: message || "" };

    mediaMessage.document = { url: doc.path };
    mediaMessage.mimetype = mime;
    mediaMessage.fileName = doc.filename;

    await sock.sendMessage(jid, mediaMessage);
    return true;
  } catch (error) {
    console.error(`Error sending document: ${error.message}`);
    if (message) {
      // If file send fails but we have a message, send just the text
      await sock.sendMessage(jid, { text: message });
    }
    throw error;
  }
}

/**
 * Send multiple document attachments
 */
async function sendMultipleDocuments(sock, jid, message, documents) {
  // Send the first document with the caption (message)
  if (documents.length > 0) {
    await sendSingleDocument(sock, jid, message, documents[0]);

    // Send the remaining documents without captions
    for (let i = 1; i < documents.length; i++) {
      await sendSingleDocument(sock, jid, "", documents[i]);
    }
  } else if (message) {
    // If no documents but we have a message, send just the text
    await sock.sendMessage(jid, { text: message });
  }
}

module.exports = sendMessage;
