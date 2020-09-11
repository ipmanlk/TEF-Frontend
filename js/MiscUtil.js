class MiscUtil {
  static getURLfromBuffer(buffer) {
      // create image url from buffer data recived from server
      const arrayBufferView = new Uint8Array(buffer.data);
      const blob = new Blob([arrayBufferView], { type: "image/png" });
      const urlCreator = window.URL || window.webkitURL;
      const imageUrl = urlCreator.createObjectURL(blob);
      return imageUrl;
  }

  static getBase64FromFile(file) {
      // create a base64 string from a file object
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
      });
  }
}

// js prototype extends for useful functions

// capitalazie first letters of words in a given string
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

// get today in inputtype=date compatible format
Date.prototype.today = function () {
  const now = new Date();
  const day = ("0" + now.getDate()).slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  return (now.getFullYear() + "-" + (month) + "-" + (day));
}