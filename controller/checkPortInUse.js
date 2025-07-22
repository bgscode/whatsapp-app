const net = require("net");

/**
 * Checks if a given port is currently in use.
 *
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
function checkPortInUse(port) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(true); // Port is already in use
        } else {
          reject(err);
        }
      })
      .once("listening", () => {
        // Successfully bound to the port, so it's free
        tester
          .once("close", () => {
            resolve(false);
          })
          .close();
      })
      .listen(port);
  });
}

module.exports = checkPortInUse;
