declare module "onvif" {
  import { EventEmitter } from "events";

  interface CamOptions {
    hostname: string;
    port?: number;
    path?: string;
    username?: string;
    password?: string;
    timeout?: number;
    preserveAddress?: boolean;
    useSecure?: boolean;
  }

  interface OnvifSimpleItem {
    $: { Name: string; Value: string };
  }

  interface OnvifMessage {
    topic?: { _?: string };
    message?: {
      message?: {
        $?: { UtcTime?: string };
        data?: {
          simpleItem?: OnvifSimpleItem | OnvifSimpleItem[];
        };
      };
    };
  }

  interface DeviceInformation {
    manufacturer?: string;
    model?: string;
    firmwareVersion?: string;
    serialNumber?: string;
    hardwareId?: string;
  }

  class Cam extends EventEmitter {
    constructor(options: CamOptions, callback?: (this: Cam, error: Error | null) => void);
    on(event: "event", listener: (message: OnvifMessage, xml?: string) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    getSystemDateAndTime(callback: (err: Error | null, date: Date) => void): void;
    getDeviceInformation(callback: (err: Error | null, info: DeviceInformation, xml?: string) => void): void;
  }

  interface DiscoveredDevice {
    hostname: string;
    port?: number;
    xaddrs?: string[];
    scopes?: string[];
  }

  interface DiscoveryStatic {
    probe(options?: { timeout?: number }, callback?: (err: Error | null, devices: DiscoveredDevice[]) => void): void;
    on(event: "device", listener: (cam: Cam, rinfo: { address: string; port: number }, xml: string) => void): void;
    on(event: "error", listener: (err: Error, xml: string) => void): void;
  }

  const Discovery: DiscoveryStatic;

  export { Cam, CamOptions, OnvifMessage, OnvifSimpleItem, DeviceInformation, DiscoveredDevice, Discovery };
}
