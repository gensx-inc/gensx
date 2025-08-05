interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  error?: string;
}

interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  error?: string;
}

chrome.runtime.onMessage.addListener(handleMessages);

function handleMessages(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GeolocationResult) => void
): boolean {
  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== "offscreen") {
    return false;
  }

  if (message.type !== "get-geolocation") {
    console.warn(`Unexpected message type received: '${message.type}'.`);
    return false;
  }

  // You can directly respond to the message from the service worker with the
  // provided `sendResponse()` callback. But in order to be able to send an async
  // response, you need to explicitly return `true` in the onMessage handler
  // As a result, you can't use async/await here. You'd implicitly return a Promise.
  getLocation(message.params).then((loc) => sendResponse(loc));

  return true;
}

// getCurrentPosition() returns a prototype-based object, so the properties
// end up being stripped off when sent to the service worker. To get
// around this, create a deep clone.
function clone(obj: any): any {
  const copy: any = {};
  // Return the value of any non true object (typeof(null) is "object") directly.
  // null will throw an error if you try to for/in it. Just return
  // the value early.
  if (obj === null || !(obj instanceof Object)) {
    return obj;
  } else {
    for (const p in obj) {
      copy[p] = clone(obj[p]);
    }
  }
  return copy;
}

async function getLocation(options: GeolocationOptions = {}): Promise<GeolocationResult> {
  // Use a raw Promise here so you can pass `resolve` and `reject` into the
  // callbacks for getCurrentPosition().
  return new Promise((resolve, reject) => {
    const geolocationOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy || false,
      timeout: options.timeout || 10000,
      maximumAge: options.maximumAge || 300000,
    };

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        const clonedPosition = clone(position);
        resolve({
          success: true,
          latitude: clonedPosition.coords.latitude,
          longitude: clonedPosition.coords.longitude,
          accuracy: clonedPosition.coords.accuracy,
          altitude: clonedPosition.coords.altitude || undefined,
          altitudeAccuracy: clonedPosition.coords.altitudeAccuracy || undefined,
          heading: clonedPosition.coords.heading || undefined,
          speed: clonedPosition.coords.speed || undefined,
          timestamp: clonedPosition.timestamp,
        });
      },
      // in case the user doesnt have/is blocking `geolocation`
      (error: GeolocationPositionError) => {
        let errorMessage = "Unknown geolocation error";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Geolocation permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Geolocation request timed out";
            break;
        }

        resolve({
          success: false,
          error: errorMessage,
        });
      },
      geolocationOptions,
    );
  });
}
