const sendNotification = async (title, message) => {
  // Send a notification to the user
  await window.api.sendNotification(title, message);
};

export default sendNotification;
